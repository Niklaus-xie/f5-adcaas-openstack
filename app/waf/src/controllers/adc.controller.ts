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
  AS3PartitionRequest,
  as3Name,
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
  ASGServiceProvider,
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
      if (!adc.management.connection || !adc.management.connection.ipAddress) {
        throw new HttpErrors.BadRequest(
          'IP address and admin passphrase are required to trust ADC hardware',
        );
      }

      let addonReq = {
        userToken: await this.reqCxt.get(WafBindingKeys.Request.KeyUserToken),
        tenantId: await this.reqCxt.get(WafBindingKeys.Request.KeyTenantId),
      };
      this.adcStCtr = new AdcStateCtrlr(adc, addonReq);

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
      await this.serialize(adc, {status: AdcState.TRUSTING, lastErr: ''});
      //TODO: Need away to input admin password of BIG-IP HW
      let device = await this.asgMgr.trust(
        adc.management.connection!.ipAddress,
        adc.management.connection!.tcpPort,
        adc.management.connection!.username,
        adc.management.connection!.password,
      );

      await checkAndWait(isTrusted, 30, [device.targetUUID]).then(
        async () => {
          await this.serialize(adc, {
            status: AdcState.TRUSTED,
            management: {
              trustedDeviceId: device.targetUUID,
            },
            lastErr: '',
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
    if (!adc.management.trustedDeviceId!) {
      return true;
    }

    try {
      await this.asgMgr.untrust(adc.management.trustedDeviceId!);
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
    await this.serialize(adc, {status: AdcState.INSTALLING, lastErr: ''});
    try {
      await this.asgMgr.installAS3(adc.management.trustedDeviceId!);

      await checkAndWait(
        () => this.adcStCtr.gotTo(AdcState.INSTALLED),
        60,
      ).then(
        async () => {
          await this.serialize(adc, {status: AdcState.INSTALLED, lastErr: ''});
        },
        async err => {
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

  async installPartition(adc: Adc): Promise<void> {
    // Install partition after installing the AS3 agent.
    let tenantName = adc.getAS3Name();
    let cnct = adc.management.connection!;
    let paritionObj = new AS3PartitionRequest(adc);
    try {
      await this.serialize(adc, {status: AdcState.PARTITIONING, lastErr: ''});
      await this.asgMgr.deploy(cnct.ipAddress, cnct.tcpPort, paritionObj);
      await checkAndWait(
        () => this.adcStCtr.gotTo(AdcState.PARTITIONED),
        60,
      ).then(
        async () => this.serialize(adc, {status: AdcState.ACTIVE, lastErr: ''}),
        async () =>
          this.serialize(adc, {
            status: AdcState.PARTITIONERR,
            lastErr: `${AdcState.PARTITIONERR}: Fail to create partition`,
          }),
      );
    } catch (err) {
      this.logger.error(`Creating partition ${tenantName} Error.`);
      await this.serialize(adc, {
        status: AdcState.PARTITIONERR,
        lastErr: `${AdcState.PARTITIONERR}: Fail to create partition: ${err.message}`,
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
        if (await this.adcStCtr.readyTo(AdcState.POWERON)) {
          this.createOn(adc, addonReq);
          return {id: adc.id};
        } else
          throw new HttpErrors.UnprocessableEntity(
            `Not ready for bigip VE to : ${AdcState.POWERON}`,
          );
      case 'delete':
        if (await this.adcStCtr.readyTo(AdcState.RECLAIMED)) {
          this.deleteOn(adc, addonReq);
          return {id: adc.id};
        } else
          throw new HttpErrors.UnprocessableEntity(
            `Not ready for bigip VE to : ${AdcState.RECLAIMED}`,
          );

      case 'setup':
        if (await this.adcStCtr.readyTo(AdcState.DOINSTALLED)) {
          this.setupOn(adc, addonReq);
          return {id: adc.id};
        } else
          throw new HttpErrors.UnprocessableEntity(
            `Not ready for bigip VE to : ${AdcState.ONBOARDED}`,
          );
      default:
        throw new HttpErrors.UnprocessableEntity(
          'Not supported: ' + Object.keys(actionBody)[0],
        );
    }
  }

  private async setupOn(adc: Adc, addon: AddonReqValues): Promise<void> {
    // install DO
    if (await this.adcStCtr.readyTo(AdcState.DOINSTALLED))
      await this.doInstalling(adc);

    // onboarding
    if (await this.adcStCtr.readyTo(AdcState.ONBOARDED))
      await this.onboarding(adc, addon);

    // trust
    if (await this.adcStCtr.readyTo(AdcState.TRUSTED)) await this.trustAdc(adc);

    // install as3
    if (await this.adcStCtr.readyTo(AdcState.INSTALLED))
      await this.installAS3(adc);

    // create tenant
    if (await this.adcStCtr.readyTo(AdcState.PARTITIONED))
      await this.installPartition(adc);
  }

  private async serialize(adc: Adc, data?: object) {
    merge(adc, data);
    await this.adcRepository.update(adc);
  }

  private async createOn(adc: Adc, addon: AddonReqValues): Promise<void> {
    try {
      await this.serialize(adc, {status: AdcState.POWERING, lastErr: ''})
        .then(() => this.cNet(adc, addon))
        .then(() => this.cSvr(adc, addon));

      await checkAndWait(() => this.adcStCtr.gotTo(AdcState.POWERON), 240)
        .then(() =>
          this.serialize(adc, {status: AdcState.POWERON, lastErr: ''}),
        )
        .catch(error => {
          throw new Error(`Timeout waiting for: ${AdcState.POWERON}`);
        });
    } catch (error) {
      await this.serialize(adc, {
        status: AdcState.POWERERR,
        lastErr: `${AdcState.POWERERR}: ${error.message}`,
      });
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
              if (adc.management.networks[n])
                ports.push(<string>adc.management.networks[n].portId);
            }
            return ports;
          })(),
        };

        await computeHelper
          .createServer(addon.userToken, serverParams)
          .then(response => {
            adc.management.connection = {
              username: BigipBuiltInProperties.admin,
              password: adminPass,
              rootPass: rootPass,
              tcpPort: BigipBuiltInProperties.port,
              ipAddress: <string>(() => {
                for (let net in adc.networks) {
                  if (adc.networks[net].type === 'mgmt') {
                    return adc.management.networks[net].fixedIp;
                  }
                }
              })(),
            };
            adc.management.vmId = response;
          });
      });
  }

  private async cNet(adc: Adc, addon: AddonReqValues): Promise<void> {
    await this.wafapp
      .get(WafBindingKeys.KeyNetworkDriver)
      .then(async networkHelper => {
        Object.assign(adc, {management: merge(adc.management, {networks: {}})});
        for (let k of Object.keys(adc.networks)) {
          let net = adc.networks[k];
          if (adc.management.networks[k] && adc.management.networks[k].portId) {
            continue;
          }

          let portParams: PortCreationParams = {
            networkId: net.networkId,
            name: <string>(adc.id + '-' + net.type + '-' + k),
          };
          if (net.fixedIp) portParams.fixedIp = net.fixedIp;

          await networkHelper
            .createPort(addon.userToken, portParams)
            .then(async port => {
              adc.management.networks[k] = {
                fixedIp: port.fixedIp,
                macAddr: port.macAddr,
                portId: port.id,
              };
            });

          if (net.floatingIp) {
            let rcd = adc.management.networks[k];
            let fips = await networkHelper.getFloatingIps(
              addon.userToken,
              net.floatingIp,
            );
            if (fips.length === 1) {
              let fip = fips[0];
              if (fip.status !== 'DOWN')
                throw new Error('The floating ip is already in use.');
              await networkHelper.bindFloatingIpToPort(
                addon.userToken,
                fip.id,
                rcd.portId!,
              );
              rcd.floatingIpCreated = false;
              rcd.floatingIpId = fip.id;
              rcd.floatingIp = net.floatingIp;
            } else {
              // fips.length must be 0.
              let fip = await networkHelper.createFloatingIp(
                addon.userToken,
                addon.tenantId,
                net.floatingIp,
                rcd.portId,
              );
              rcd.floatingIpId = fip.id;
              rcd.floatingIpCreated = true;
              rcd.floatingIp = net.floatingIp;
            }
          }

          await this.serialize(adc);
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
          let cnct = adc.management.connection!;
          let bigipMgr = await BigIpManager.instanlize({
            username: cnct.username,
            password: cnct.password,
            ipAddr: cnct.ipAddress,
            port: cnct.tcpPort,
          });

          let noLicensed = async () => {
            if (adc.license) return true;
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
          if (!adc.management.networks[network]) continue;

          try {
            let portId = adc.management.networks[network].portId!;
            await networkMgr
              .deletePort(addon.userToken, portId)
              .then(async () => {
                this.logger.debug(`Deleted port ${portId}`);
                let rcd = adc.management.networks[network];
                if (rcd.floatingIpCreated)
                  await networkMgr
                    .deleteFloatingIp(addon.userToken, rcd.floatingIpId!)
                    .then(() => {
                      delete rcd.floatingIpId;
                      delete rcd.floatingIpCreated;
                      delete rcd.floatingIp;
                    });
                delete adc.management.networks[network];
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
        if (adc.management.vmId) {
          await computeMgr
            .deleteServer(addon.userToken, adc.management.vmId!, addon.tenantId)
            .then(() => {
              this.logger.debug(`Deleted the vm ${adc.management.vmId!}`);
              delete adc.management.vmId;
              adc.management.connection = undefined;
            });
        }
      },

      trust: async () => {
        await this.untrustAdc(adc);
      },

      install: () => {},
    };

    try {
      this.serialize(adc, {status: AdcState.RECLAIMING, lastErr: ''});
      for (let f of ['trust', 'license', 'vm', 'network']) {
        await reclaimFuncs[f]();
      }
      this.serialize(adc, {status: AdcState.RECLAIMED, lastErr: ''});
    } catch (error) {
      this.logger.error(`Reclaiming fails: ${error.message}`);
      this.serialize(adc, {
        status: AdcState.RECLAIMERR,
        lastErr: `${AdcState.RECLAIMERR}: ${error.message}; Please try again.`,
      });
    }
  }

  private async isDOReady(adc: Adc): Promise<boolean> {
    let cnct = adc.management.connection!;
    let bigipMgr = await BigIpManager.instanlize({
      username: cnct.username,
      password: cnct.password,
      ipAddr: cnct.ipAddress,
      port: cnct.tcpPort,
    });

    try {
      let resObj = await bigipMgr.getDOStatus();
      let code = JSON.parse(resObj)['body'][0][0]['result']['status'];
      return code === 'OK';
    } catch {
      console.log('DO URI has not been registered.');
      return false;
    }
  }

  private async doInstalling(adc: Adc): Promise<void> {
    try {
      this.logger.debug('start to install do');
      await this.serialize(adc, {status: AdcState.DOINSTALLING});
      // check if do is already installed.
      let cnct = adc.management.connection!;
      let bigipMgr = await BigIpManager.instanlize({
        username: cnct.username,
        password: cnct.password,
        ipAddr: cnct.ipAddress,
        port: cnct.tcpPort,
      });

      if ((await this.isDOReady(adc)) === false) {
        await bigipMgr.uploadDO();
        await bigipMgr.installDO();
      }

      await checkAndWait(
        () => this.adcStCtr.gotTo(AdcState.DOINSTALLED),
        240,
      ).then(() =>
        this.serialize(adc, {status: AdcState.DOINSTALLED, lastErr: ''}),
      );
    } catch (error) {
      await this.serialize(adc, {
        status: AdcState.POWERON,
        lastErr: `${AdcState.DOINSTALLERR}: ${error}`,
      });
    }
  }
  private async onboarding(adc: Adc, addon: AddonReqValues): Promise<void> {
    try {
      this.logger.debug('start to do onbarding');
      await this.serialize(adc, {status: AdcState.ONBOARDING});

      let doMgr = await OnboardingManager.instanlize(this.wafapp);
      let doBody = await doMgr.assembleDo(adc, {onboarding: true});
      let doId = await doMgr.onboarding(doBody);

      await checkAndWait(() => doMgr.isDone(doId), 240)
        .then(() =>
          checkAndWait(() => this.adcStCtr.gotTo(AdcState.ONBOARDED), 240),
        )
        .then(() => this.serialize(adc, {status: AdcState.ONBOARDED}));
    } catch (error) {
      await this.serialize(adc, {
        status: AdcState.ONBOARDERR,
        lastErr: `${AdcState.ONBOARDERR}: ${error}`,
      });
    }
  }
}

export type AddonReqValues = {
  userToken: string;
  tenantId: string;
};

export class AdcStateCtrlr {
  private states: AdcStateEntry[] = [
    {
      state: AdcState.NEW,
      check: (ctrl: AdcStateCtrlr) => {
        return Promise.resolve(true);
      },
      next: [AdcState.POWERON],
    },
    {
      failure: AdcState.POWERERR,
      state: AdcState.POWERON,
      check: this.accessible,
      next: [AdcState.DOINSTALLED, AdcState.RECLAIMED],
    },
    {
      failure: AdcState.DOINSTALLERR,
      state: AdcState.DOINSTALLED,
      check: this.doInstalled,
      next: [AdcState.ONBOARDED, AdcState.RECLAIMED],
    },
    {
      failure: AdcState.ONBOARDERR,
      state: AdcState.ONBOARDED,
      check: this.onboarded,
      next: [AdcState.TRUSTED, AdcState.RECLAIMED],
    },
    {
      failure: AdcState.TRUSTERR,
      state: AdcState.TRUSTED,
      check: this.trusted,
      next: [AdcState.INSTALLED, AdcState.RECLAIMED],
    },
    {
      failure: AdcState.INSTALLERR,
      state: AdcState.INSTALLED,
      check: this.installed,
      next: [AdcState.PARTITIONED, AdcState.RECLAIMED],
    },
    {
      failure: AdcState.PARTITIONERR,
      state: AdcState.PARTITIONED,
      check: this.partitioned,
      next: [AdcState.RECLAIMED, AdcState.ACTIVE],
    },
    {
      failure: AdcState.RECLAIMERR,
      state: AdcState.RECLAIMED,
      check: this.reclaimed,
      next: [AdcState.POWERON],
    },
    {
      state: AdcState.ACTIVE,
      check: (ctrl: AdcStateCtrlr) => {
        return Promise.resolve(true);
      },
      next: [AdcState.RECLAIMED],
    },
  ];

  constructor(private adc: Adc, private addon: AddonReqValues) {}

  async readyTo(state: string): Promise<boolean> {
    let stateEntry = this.getStateEntry(this.adc.status);

    if (this.adc.status.endsWith('ERROR')) {
      if (state === stateEntry.state) return true;
      else return false;
    }

    return stateEntry.next.includes(state) && (await stateEntry['check'](this));
  }

  async gotTo(state: string): Promise<boolean> {
    return this.getStateEntry(state)['check'](this);
  }

  private getStateEntry(name: string): AdcStateEntry {
    return this.states.find(s => {
      return s.state === name || s.failure === name;
    })!;
  }

  private async getBigipMgr(): Promise<BigIpManager> {
    if (!this.adc.management.connection)
      throw new Error(
        `The management session of ADC is empty, cannot initialize bigip manager.`,
      );

    let cnct = this.adc.management.connection;
    return BigIpManager.instanlize({
      username: cnct.username,
      password: cnct.password,
      ipAddr: cnct.ipAddress,
      port: cnct.tcpPort,
    });
  }

  private async getAsgMgr(): Promise<ASGManager> {
    let svc = await new ASGServiceProvider().value();
    return new ASGManager(svc);
  }

  // Notices:
  // Why not use 'this' in the following functions:
  // The scope of 'this' changes when placing 'this.onboarded/trusted/...'
  // in the AdcStateEntry declaration in the above 'states' member.
  // So, please pass in the 'ctrl' object to when accessing AdcStateCtrlr.

  private reclaimed(ctrl: AdcStateCtrlr): Promise<boolean> {
    return Promise.resolve(
      ((): boolean => {
        if (ctrl.adc.management.connection) return false;
        if (ctrl.adc.management.vmId) return false;
        for (let net of Object.keys(ctrl.adc.networks)) {
          if (
            ctrl.adc.management.networks[net] &&
            ctrl.adc.management.networks[net].portId
          )
            return false;
        }
        return true;
      })(),
    );
  }

  private async doInstalled(ctrl: AdcStateCtrlr): Promise<boolean> {
    let bigipMgr = await ctrl.getBigipMgr();
    let resObj = await bigipMgr.getDOStatus();
    let code = JSON.parse(resObj)['body'][0][0]['result']['status'];
    return code === 'OK';
  }

  private async trusted(ctrl: AdcStateCtrlr): Promise<boolean> {
    if (!ctrl.adc.management.trustedDeviceId) return false;

    let asgMgr = await ctrl.getAsgMgr();
    let state = await asgMgr.getTrustState(
      ctrl.adc.management.trustedDeviceId!,
    );
    return state === 'ACTIVE';
  }

  private async onboarded(ctrl: AdcStateCtrlr): Promise<boolean> {
    let bigipMgr = await ctrl.getBigipMgr();
    return Promise.all([
      bigipMgr.getHostname(),
      bigipMgr.getLicense(),
      bigipMgr.getConfigsyncIp(),
      bigipMgr.getVlans(),
      bigipMgr.getSelfips(),
    ]).then(([hostname, license, configSyncIp, vlans, selfs]) => {
      return (
        hostname.includes(ctrl.adc.id) &&
        license.registrationKey !== 'none' &&
        configSyncIp !== 'none' &&
        Object.keys(vlans).length !== 0 &&
        Object.keys(selfs).length !== 0
      );
    });
  }

  private async partitioned(ctrl: AdcStateCtrlr): Promise<boolean> {
    let bigipMgr = await ctrl.getBigipMgr();
    let partition = as3Name(ctrl.adc.tenantId);
    let resObj = await bigipMgr.getPartition(partition);
    let code = JSON.parse(resObj)['body'][0]['name'];
    return code === partition;
  }

  private async accessible(ctrl: AdcStateCtrlr): Promise<boolean> {
    let bigipMgr = await ctrl.getBigipMgr();

    return bigipMgr
      .getSys()
      .then(() => Promise.resolve(true))
      .catch(() => Promise.reject(false));
  }

  private async installed(ctrl: AdcStateCtrlr): Promise<boolean> {
    return Promise.all([ctrl.getAsgMgr(), ctrl.getBigipMgr()])
      .then(([asgMgr, bigipMgr]) => {
        return Promise.all([
          asgMgr.getAS3State(ctrl.adc.management.trustedDeviceId!),
          bigipMgr.getAS3Info(),
        ]);
      })
      .then(([state, as3Info]) => {
        // @ts-ignore as3Info must contain version.
        return state === 'AVAILABLE' && as3Info.version !== 'not-exists';
      });
  }
}

type AdcStateEntry = {
  failure?: string;
  state: string;
  check: (ctr: AdcStateCtrlr) => Promise<boolean>;
  next: string[];
};

export enum AdcState {
  NEW = 'NEW',

  POWERON = 'POWERON',
  POWERING = 'POWERING',
  POWERERR = 'POWERERROR',

  DOINSTALLED = 'DOINSTALLED',
  DOINSTALLING = 'DOINSTALLING',
  DOINSTALLERR = 'DOINSTALLERR',

  ONBOARDED = 'ONBOARDED',
  ONBOARDING = 'ONBOARDING',
  ONBOARDERR = 'ONBOARDERROR',

  TRUSTED = 'TRUSTED',
  TRUSTING = 'TRUSTING',
  TRUSTERR = 'TRUSTERROR',

  INSTALLED = 'INSTALLED',
  INSTALLING = 'INSTALLING',
  INSTALLERR = 'INSTALLERROR',

  PARTITIONED = 'PARTITIONED',
  PARTITIONING = 'PARTITIONING',
  PARTITIONERR = 'PARTITIONERROR',

  RECLAIMED = 'RECLAIMED',
  RECLAIMING = 'RECLAIMING',
  RECLAIMERR = 'RECLAIMERROR',

  ACTIVE = 'ACTIVE',
}
