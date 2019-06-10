/**
 * Copyright 2019 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  getWhereSchemaFor,
  patch,
  del,
  requestBody,
  HttpErrors,
  RestBindings,
  RequestContext,
} from '@loopback/rest';
import {
  Adc,
  Tenant,
  ActionsBody,
  ActionsResponse,
  ActionsRequest,
} from '../models';
import {AdcRepository, AdcTenantAssociationRepository} from '../repositories';
import {BaseController, Schema, Response, CollectionResponse} from '.';
import {inject, CoreBindings} from '@loopback/core';
import {factory} from '../log4ts';
import {WafBindingKeys} from '../keys';
import {WafApplication} from '../application';
import {
  ASGService,
  ASGManager,
  PortCreationParams,
  ServersParams,
  BigIpManager,
  OnboardingManager,
  BigipBuiltInProperties,
} from '../services';
import {checkAndWait, merge} from '../utils';

const prefix = '/adcaas/v1';

export class AdcController extends BaseController {
  asgMgr: ASGManager;
  private adcStCtr: AdcStateCtrlr;

  constructor(
    @repository(AdcRepository)
    public adcRepository: AdcRepository,
    @repository(AdcTenantAssociationRepository)
    public adcTenantAssociationRepository: AdcTenantAssociationRepository,
    @inject('services.ASGService')
    public asgService: ASGService,
    //Suppress get injection binding exeption by using {optional: true}
    @inject(RestBindings.Http.CONTEXT, {optional: true})
    protected reqCxt: RequestContext,
    @inject(CoreBindings.APPLICATION_INSTANCE)
    private wafapp: WafApplication,
    private logger = factory.getLogger('controllers.adc'),
  ) {
    super(reqCxt);
    this.asgMgr = new ASGManager(this.asgService);
  }

  @post(prefix + '/adcs', {
    responses: {
      '200': Schema.response(Adc, 'Successfully create ADC resource'),
      '400': Schema.badRequest('Invalid ADC resource'),
      '422': Schema.unprocessableEntity('Unprocessable ADC resource'),
    },
  })
  async create(
    @requestBody(
      Schema.createRequest(Adc, 'ADC resource that need to be created'),
    )
    reqBody: Partial<Adc>,
  ): Promise<Response> {
    reqBody.tenantId = await this.tenantId;

    //TODO: Reject create ADC HW request with duplicated mgmt IP address
    let adc: Adc;
    try {
      adc = await this.adcRepository.create(reqBody);
    } catch (e) {
      throw new HttpErrors.UnprocessableEntity(e.message);
    }

    if (adc.type === 'HW') {
      //TODO: Disable this path after VE path is stable.
      //TODO: Do this check in API validator
      if (!adc.management || !adc.management.ipAddress) {
        throw new HttpErrors.BadRequest(
          'IP address and admin passphrase are required to trust ADC hardware',
        );
      }

      this.trustAdc(adc).then(() => {
        if (adc.status === AdcState.TRUSTED) {
          this.installAS3(adc);
        }
      });
    }

    return new Response(Adc, adc);
  }

  async trustAdc(adc: Adc): Promise<void> {
    let isTrusted = async (deviceId: string): Promise<boolean> => {
      return await this.asgMgr.getTrustState(deviceId).then(state => {
        switch (state) {
          case 'ACTIVE':
            return true;
          case 'PENDING':
            return false;
          default:
            //TODO: throw error after checkAndWait() supports error terminating
            return false;
        }
      });
    };

    try {
      await this.serialize(adc, {status: AdcState.TRUSTING});
      //TODO: Need away to input admin password of BIG-IP HW
      let device = await this.asgMgr.trust(
        adc.management!.ipAddress,
        adc.management!.tcpPort,
        adc.management!.username,
        adc.management!.password,
      );

      await checkAndWait(isTrusted, 30, [device.targetUUID]).then(
        async () => {
          await this.serialize(adc, {
            status: AdcState.TRUSTED,
            trustedDeviceId: device.targetUUID,
          });
        },
        async () => {
          await this.serialize(adc, {
            status: AdcState.TRUSTERR,
            lastErr: `${AdcState.TRUSTERR}: Trusting timeout`,
          });
        },
      );
    } catch (err) {
      await this.serialize(adc, {
        status: AdcState.TRUSTERR,
        lastErr: err.message,
      });
    }
  }

  async untrustAdc(adc: Adc): Promise<boolean> {
    if (!adc.trustedDeviceId) {
      return true;
    }

    try {
      await this.asgMgr.untrust(adc.trustedDeviceId);
    } catch (err) {
      await this.serialize(adc, {
        status: AdcState.TRUSTERR,
        lastErr: err.message,
      });
      return false;
    }
    return true;
  }

  async installAS3(adc: Adc): Promise<void> {
    // Install AS3 RPM on target device
    await this.serialize(adc, {status: AdcState.INSTALLING});

    try {
      let exist = await this.asgMgr.as3Exists(adc.trustedDeviceId!);

      if (exist) {
        await this.serialize(adc, {status: AdcState.ACTIVE});
        return;
      }
    } catch (err) {
      await this.serialize(adc, {
        status: AdcState.INSTALLERR,
        lastErr: `${AdcState.INSTALLERR}: ${err.message}`,
      });
      return;
    }

    let as3Available = async (deviceId: string): Promise<boolean> => {
      return await this.asgMgr.getAS3State(deviceId).then(state => {
        switch (state) {
          case 'AVAILABLE':
            return true;
          default:
            //TODO: throw error after checkAndWait() supports error terminating
            return false;
        }
      });
    };

    try {
      await this.asgMgr.installAS3(adc.trustedDeviceId!);

      await checkAndWait(as3Available, 60, [adc.trustedDeviceId!]).then(
        async () => {
          await this.serialize(adc, {status: AdcState.ACTIVE});
        },
        async () => {
          await this.serialize(adc, {
            status: AdcState.INSTALLERR,
            lastErr: `${AdcState.INSTALLERR}: Fail to install AS3`,
          });
        },
      );
    } catch (err) {
      await this.serialize(adc, {
        status: AdcState.INSTALLERR,
        lastErr: `${AdcState.INSTALLERR}: ${err.message}`,
      });
    }
  }

  @get(prefix + '/adcs/count', {
    responses: {
      '200': {
        description: 'ADC resource count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @param.query.object('where', getWhereSchemaFor(Adc)) where?: Where,
  ): Promise<Count> {
    //TODO: support multi-tenancy
    return await this.adcRepository.count(where);
  }

  @get(prefix + '/adcs', {
    responses: {
      '200': Schema.collectionResponse(
        Adc,
        'Successfully retrieve ADC resources',
      ),
    },
  })
  async find(
    @param.query.object('filter', getFilterSchemaFor(Adc)) filter?: Filter,
  ): Promise<CollectionResponse> {
    let data = await this.adcRepository.find(filter, {
      tenantId: await this.tenantId,
    });
    return new CollectionResponse(Adc, data);
  }

  @get(prefix + '/adcs/{adcId}', {
    responses: {
      '200': Schema.response(Adc, 'Successfully retrieve ADC resource'),
      '404': Schema.notFound('Can not find ADC resource'),
    },
  })
  async findById(
    @param(Schema.pathParameter('adcId', 'ADC resource ID')) id: string,
  ): Promise<Response> {
    let data = await this.adcRepository.findById(id, undefined, {
      tenantId: await this.tenantId,
    });
    return new Response(Adc, data);
  }

  @patch(prefix + '/adcs/{adcId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully update ADC resource'),
      '404': Schema.notFound('Can not find ADC resource'),
    },
  })
  async updateById(
    @param(Schema.pathParameter('adcId', 'ADC resource ID')) id: string,
    @requestBody(
      Schema.updateRequest(
        Adc,
        'ADC resource properties that need to be updated',
      ),
    )
    adc: Partial<Adc>,
  ): Promise<void> {
    // TODO: create the unified way in schema to check request body.
    if (adc.status || adc.createdAt || adc.updatedAt || adc.management)
      throw new HttpErrors.BadRequest('Not changable properties.');

    await this.adcRepository.updateById(id, adc, {
      tenantId: await this.tenantId,
    });
  }

  @del(prefix + '/adcs/{adcId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully delete ADC resource'),
      '404': Schema.notFound('Can not find ADC resource'),
    },
  })
  async deleteById(
    @param(Schema.pathParameter('adcId', 'ADC resource ID')) id: string,
  ): Promise<void> {
    let adc = await this.adcRepository.findById(id, undefined, {
      tenantId: await this.tenantId,
    });

    if (adc.type === 'HW' && !(await this.untrustAdc(adc))) {
      throw new HttpErrors.UnprocessableEntity('Fail to untrust device');
    }

    await this.adcRepository.deleteById(id);
  }

  //TODO: multitenancy sharing model and api
  @get(prefix + '/adcs/{adcId}/tenants', {
    responses: {
      '200': Schema.collectionResponse(
        Tenant,
        'Successfully retrieve Tenant resources',
      ),
    },
  })
  async findTenants(
    @param(Schema.pathParameter('adcId', 'ADC resource ID')) id: string,
  ): Promise<CollectionResponse> {
    let assocs = await this.adcTenantAssociationRepository.find({
      where: {
        adcId: id,
      },
    });

    let tenants: Tenant[] = [];
    assocs.forEach(assoc =>
      tenants.push(
        new Tenant({
          id: assoc.tenantId,
        }),
      ),
    );

    return new CollectionResponse(Tenant, tenants);
  }

  //TODO: multitenancy sharing model and api
  @get(prefix + '/adcs/{adcId}/tenants/{tenantId}', {
    responses: {
      '200': Schema.response(Tenant, 'Successfully retrieve Tenant resource'),
    },
  })
  async findTenant(
    @param(Schema.pathParameter('adcId', 'ADC resource ID')) adcId: string,
    @param(Schema.pathParameter('tenantId', 'OpenStack project ID'))
    tenantId: string,
  ): Promise<Response> {
    let assocs = await this.adcTenantAssociationRepository.find({
      where: {
        adcId: adcId,
        tenantId: tenantId,
      },
    });

    if (assocs.length === 0) {
      throw new HttpErrors.NotFound('Cannot find association.');
    } else {
      return new Response(
        Tenant,
        new Tenant({
          id: assocs[0].tenantId,
        }),
      );
    }
  }

  // TODO: schema.response not work well here.
  // It shows the below in Example Value:
  // {
  //   "actionsresponse": {
  //     "id": "11111111-2222-3333-4444-555555555555"
  //   }
  // }
  @post(prefix + '/adcs/{adcId}/action', {
    responses: {
      '200': Schema.response(ActionsResponse, 'Adc Id for the actions.'),
    },
  })
  async provision(
    @param(Schema.pathParameter('adcId', 'ADC resource ID')) id: string,
    @requestBody(Schema.createRequest(ActionsRequest, 'actions request'))
    actionBody: ActionsBody,
  ): Promise<object | undefined> {
    let adc = await this.adcRepository.findById(id, undefined, {
      tenantId: await this.tenantId,
    });

    let addonReq = {
      userToken: await this.reqCxt.get(WafBindingKeys.Request.KeyUserToken),
      tenantId: await this.reqCxt.get(WafBindingKeys.Request.KeyTenantId),
    };
    this.adcStCtr = new AdcStateCtrlr(adc, addonReq);

    if (adc.status.endsWith('ING'))
      throw new HttpErrors.UnprocessableEntity(
        `Adc status is ' ${adc.status}. Cannot be operated on, please wait for its finish.`,
      );

    switch (Object.keys(actionBody)[0]) {
      case 'create':
        this.createOn(adc, addonReq);
        return {id: adc.id};

      case 'delete':
        this.deleteOn(adc, addonReq);
        return {id: adc.id};

      case 'setup':
        this.setupOn(adc, addonReq);
        return {id: adc.id};

      default:
        throw new HttpErrors.UnprocessableEntity(
          'Not supported: ' + Object.keys(actionBody)[0],
        );
    }

    let msg = `Cannot do '${Object.keys(actionBody)[0]}' on adc ${
      adc.id
    }, state: ${adc.status}, lasterr: ${adc.lastErr}`;
    this.logger.error(msg);
    throw new HttpErrors.UnprocessableEntity(msg);
  }

  private async setupOn(adc: Adc, addon: AddonReqValues): Promise<void> {
    if (!adc.management) {
      this.serialize(adc, {
        status: AdcState.ONBOARDERR,
        lastErr: `${AdcState.ONBOARDERR}: management information not ready.`,
      });
      return;
    }
    await checkAndWait(
      () => this.adcStCtr.readyTo(AdcState.ONBOARDED).then(() => true),
      240,
    ).then(
      async () => {
        await this.serialize(adc, {status: AdcState.ONBOARDING});
        this.logger.debug('start to do onbarding');
        let doMgr = await OnboardingManager.instanlize(this.wafapp);
        let doBody = await doMgr.assembleDo(adc, {onboarding: true});
        this.logger.debug(
          'Json used for onboarding: ' + JSON.stringify(doBody),
        );
        await doMgr.onboarding(doBody).then(
          async doId => {
            await checkAndWait(() => {
              return doMgr.isDone(doId);
            }, 240);

            await checkAndWait(
              () => this.adcStCtr.gotTo(AdcState.ONBOARDED).then(() => true),
              240,
            ).then(
              async () => {
                await this.serialize(adc, {status: AdcState.ONBOARDED});

                //Build trust relation to VE and install AS3
                await this.trustAdc(adc).then(async () => {
                  if (adc.status === AdcState.TRUSTED) {
                    await this.installAS3(adc);
                  }
                });
              },
              async () => {
                await this.serialize(adc, {
                  status: AdcState.ONBOARDERR,
                  lastErr:
                    `${AdcState.ONBOARDERR}: The onboarding took too long time to finish: timeout. ` +
                    `Check more details from log.`,
                });
              },
            );
          },
          async reason => {
            await this.serialize(adc, {
              status: AdcState.ONBOARDERR,
              lastErr: `${AdcState.ONBOARDERR}: ${reason}`,
            });
          },
        );
      },
      async () => {
        let errmsg =
          'bigip is not ready after waiting timeout. Cannot go forwards';
        this.logger.error(errmsg);
        await this.serialize(adc, {
          status: AdcState.ONBOARDERR,
          lastErr: `${AdcState.ONBOARDERR}: ${errmsg}`,
        });
        throw new Error(errmsg);
      },
    );
  }

  private async serialize(adc: Adc, data?: object) {
    merge(adc, data);
    await this.adcRepository.update(adc);
  }

  private async createOn(adc: Adc, addon: AddonReqValues): Promise<void> {
    try {
      if (await this.adcStCtr.readyTo(AdcState.POWERON)) {
        await this.serialize(adc, {status: AdcState.POWERING})
          .then(async () => await this.cNet(adc, addon))
          .then(async () => await this.cSvr(adc, addon));

        let poweronFunc = () => {
          return this.adcStCtr.gotTo(AdcState.POWERON);
        };
        await checkAndWait(poweronFunc, 240)
          .then(async () => {
            await this.serialize(adc, {status: AdcState.POWERON});
          })
          .catch(error => {
            throw new Error(`Timeout waiting for: ${AdcState.POWERON}`);
          });
      } else throw new Error(`Not ready for bigip VE to : ${AdcState.POWERON}`);
    } catch (error) {
      await this.serialize(adc, {
        status: AdcState.POWERERR,
        lastErr: `${AdcState.POWERERR}: ${error.message}`,
      });
      throw error;
    }
  }

  private async cSvr(adc: Adc, addon: AddonReqValues): Promise<void> {
    await this.wafapp
      .get(WafBindingKeys.KeyComputeManager)
      .then(async computeHelper => {
        // TODO: uncomment me.
        // let rootPass = Math.random()
        //   .toString(36)
        //   .slice(-8);
        // let adminPass = Math.random()
        //   .toString(36)
        //   .slice(-8);
        let rootPass = 'default';
        let adminPass = 'admin';
        let userdata: string = await this.cUserdata(rootPass, adminPass);

        let serverParams: ServersParams = {
          userTenantId: addon.tenantId,
          vmName: adc.id,
          imageRef: adc.compute.imageRef,
          flavorRef: adc.compute.flavorRef,
          securityGroupName: 'default', //TODO: remove the hardcode in the future.
          userData: userdata,
          ports: (() => {
            let ports = [];
            for (let n of Object.keys(adc.networks)) {
              ports.push(<string>adc.networks[n].portId);
            }
            return ports;
          })(),
        };

        await computeHelper
          .createServer(addon.userToken, serverParams)
          .then(response => {
            adc.compute.vmId = response;
            adc.management = {
              username: BigipBuiltInProperties.admin,
              password: adminPass,
              rootPass: rootPass,
              tcpPort: BigipBuiltInProperties.port,
              ipAddress: <string>(() => {
                for (let net in adc.networks) {
                  if (adc.networks[net].type === 'mgmt') {
                    return adc.networks[net].fixedIp;
                  }
                }
              })(),
            };
          });
      });
  }

  private async cNet(adc: Adc, addon: AddonReqValues): Promise<void> {
    await this.wafapp
      .get(WafBindingKeys.KeyNetworkDriver)
      .then(async networkHelper => {
        for (let k of Object.keys(adc.networks)) {
          let net = adc.networks[k];
          if (net.portId && net.ready) continue;

          net.ready = false;

          let portParams: PortCreationParams = {
            networkId: net.networkId,
            name: <string>(adc.id + '-' + net.type + '-' + k),
          };
          if (net.fixedIp) portParams.fixedIp = net.fixedIp;

          await networkHelper
            .createPort(addon.userToken, portParams)
            .then(async port => {
              net.fixedIp = port.fixedIp;
              net.macAddr = port.macAddr;
              net.portId = port.id;
              net.ready = true;

              await this.serialize(adc);
            });
        }
      });
  }

  private async cUserdata(
    rootPassword: string,
    adminPassword: string,
  ): Promise<string> {
    const userData: string = `#cloud-config
    runcmd:
     - "echo \\"root:${rootPassword}\\" | chpasswd"
     - "echo \\"admin:${adminPassword}\\" | chpasswd"`;

    this.logger.debug('userdata for create vm: ' + userData);
    const userDataB64Encoded = Buffer.from(userData).toString('base64');

    return userDataB64Encoded;
  }

  private async deleteOn(adc: Adc, addon: AddonReqValues): Promise<void> {
    let reclaimFuncs: {[key: string]: Function} = {
      license: async () => {
        let doMgr = await OnboardingManager.instanlize(this.wafapp);
        let doBody = await doMgr.assembleDo(adc, {onboarding: false});
        this.logger.debug(
          'Json used for revoke license: ' + JSON.stringify(doBody),
        );
        await doMgr.onboarding(doBody).then(async () => {
          // TODO: create a unified bigipMgr
          let mgmt = adc.management!;
          let bigipMgr = await BigIpManager.instanlize({
            username: mgmt.username,
            password: mgmt.password,
            ipAddr: mgmt.ipAddress,
            port: mgmt.tcpPort,
          });

          let noLicensed = async () => {
            return await bigipMgr.getLicense().then(license => {
              return license.registrationKey === 'none';
            });
          };
          await checkAndWait(noLicensed, 240).catch(() => {
            throw new Error('Timeout for waiting for reclaiming license.');
          });
        });
      },

      network: async () => {
        let networkMgr = await this.wafapp.get(WafBindingKeys.KeyNetworkDriver);
        for (let network of Object.keys(adc.networks)) {
          if (!adc.networks[network].ready) continue;

          try {
            let portId = adc.networks[network].portId!;
            await networkMgr.deletePort(addon.userToken, portId).then(() => {
              this.logger.debug(`Deleted port ${portId}`);
              delete adc.networks[network].portId;
              delete adc.networks[network].fixedIp;
              delete adc.networks[network].macAddr;
              adc.networks[network].ready = false;
            });
          } catch (error) {
            this.logger.error(`delete port for ${network}: ${error.message}`);
          }
        }
      },

      vm: async () => {
        let computeMgr = await this.wafapp.get(
          WafBindingKeys.KeyComputeManager,
        );
        if (adc.compute.vmId) {
          await computeMgr
            .deleteServer(addon.userToken, adc.compute.vmId!, addon.tenantId)
            .then(() => {
              this.logger.debug(`Deleted the vm ${adc.compute.vmId!}`);
              delete adc.compute.vmId;
              adc.management = undefined;
            });
        }
      },

      trust: () => {},
    };

    try {
      this.serialize(adc, {status: AdcState.RECLAIMING});
      for (let f of ['trust', 'license', 'vm', 'network']) {
        await reclaimFuncs[f]();
      }
      this.serialize(adc, {status: AdcState.RECLAIMED});
    } catch (error) {
      this.logger.error(`Reclaiming fails: ${error.message}`);
      this.serialize(adc, {
        status: AdcState.RECLAIMERR,
        lastErr: `${AdcState.RECLAIMERR}: ${error.message}; Please try again.`,
      });
    }
  }
}

type AddonReqValues = {
  userToken: string;
  tenantId: string;
};

class AdcStateCtrlr {
  private states: AdcStateEntry[] = [
    {
      state: AdcState.NEW,
      check: Promise.resolve(true),
      next: [AdcState.POWERON],
    },
    {
      state: AdcState.POWERON,
      check: this.accessible(),
      next: [AdcState.ONBOARDED, AdcState.RECLAIMED],
    },
    {
      state: AdcState.ONBOARDED,
      check: this.onboarded(),
      next: [AdcState.TRUSTED, AdcState.RECLAIMED],
    },
    {
      state: AdcState.TRUSTED,
      check: this.trusted(),
      next: [AdcState.RECLAIMED],
    },
    {
      state: AdcState.RECLAIMED,
      check: Promise.resolve(this.reclaimed()),
      next: [AdcState.POWERON],
    },
  ];

  constructor(private adc: Adc, private addon: AddonReqValues) {}

  async readyTo(state: string): Promise<boolean> {
    let stateEntry = this.getStateEntry(this.adc.status);
    return (await stateEntry.check) && stateEntry.next.includes(state);
  }

  async gotTo(state: string): Promise<boolean> {
    return this.getStateEntry(state).check;
  }

  private getStateEntry(name: string): AdcStateEntry {
    return this.states.find(s => {
      return s.state === name;
    })!;
  }

  private reclaimed(): boolean {
    if (this.adc.management) return false;
    if (this.adc.compute.vmId) return false;
    for (let net of Object.keys(this.adc.networks)) {
      if (this.adc.networks[net].portId) return false;
    }
    return true;
  }

  private async trusted(): Promise<boolean> {
    return Promise.resolve(true);
  }

  private async onboarded(): Promise<boolean> {
    let bigipMgr = await this.getBigipMgr();
    return Promise.all([
      bigipMgr.getHostname(),
      bigipMgr.getLicense(),
      bigipMgr.getConfigsyncIp(),
      bigipMgr.getVlans(),
      bigipMgr.getSelfips(),
    ]).then(([hostname, license, configSyncIp, vlans, selfs]) => {
      return (
        hostname.includes(this.adc.id) &&
        license.registrationKey !== 'none' &&
        configSyncIp !== 'none' &&
        Object.keys(vlans).length !== 0 &&
        Object.keys(selfs).length !== 0
      );
    });
  }

  private async accessible(): Promise<boolean> {
    let bigipMgr = await this.getBigipMgr();

    return bigipMgr
      .getSys()
      .then(() => Promise.resolve(true))
      .catch(() => Promise.reject(false));
  }

  private async getBigipMgr(): Promise<BigIpManager> {
    if (!this.adc.management)
      throw new Error(
        `The management session of ADC is empty, cannot initialize bigip manager.`,
      );

    let mgmt = this.adc.management;
    return BigIpManager.instanlize({
      username: mgmt.username,
      password: mgmt.password,
      ipAddr: mgmt.ipAddress,
      port: mgmt.tcpPort,
    });
  }
}

type AdcStateEntry = {
  state: string;
  check: Promise<boolean>;
  next: string[];
};

export enum AdcState {
  NEW = 'NEW',

  POWERON = 'POWERON',
  POWERING = 'POWERING',
  POWERERR = 'POWERERROR',

  ONBOARDED = 'ONBOARDED',
  ONBOARDING = 'ONBOARDING',
  ONBOARDERR = 'ONBOARDERROR',

  TRUSTED = 'TRUSTED',
  TRUSTING = 'TRUSTING',
  TRUSTERR = 'TRUSTERROR',

  INSTALLED = 'INSTALLED',
  INSTALLING = 'INSTALLING',
  INSTALLERR = 'INSTALLERROR',

  RECLAIMED = 'RECLAIMED',
  RECLAIMING = 'RECLAIMING',
  RECLAIMERR = 'RECLAIMERROR',

  ACTIVE = 'ACTIVE',
}
