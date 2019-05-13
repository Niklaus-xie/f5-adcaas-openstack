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
  TrustedDeviceRequest,
  TrustedDevice,
  TrustedDeviceService,
  PortCreationParams,
  ServersParams,
  BigIpManager,
  OnboardingManager,
  BigipBuiltInProperties,
} from '../services';
import {checkAndWait, merge} from '../utils';

const prefix = '/adcaas/v1';

const ASG_HOST: string = process.env.ASG_HOST || 'localhost';
const ASG_PORT: number = Number(process.env.ASG_PORT) || 8443;

async function sleep(time: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    setTimeout(resolve, time);
  });
}

export class AdcController extends BaseController {
  constructor(
    @repository(AdcRepository)
    public adcRepository: AdcRepository,
    @repository(AdcTenantAssociationRepository)
    public adcTenantAssociationRepository: AdcTenantAssociationRepository,
    @inject('services.TrustedDeviceService')
    public trustedDeviceService: TrustedDeviceService,
    //Suppress get injection binding exeption by using {optional: true}
    @inject(RestBindings.Http.CONTEXT, {optional: true})
    protected reqCxt: RequestContext,
    @inject(CoreBindings.APPLICATION_INSTANCE)
    private wafapp: WafApplication,
    private logger = factory.getLogger('controllers.adc'),
  ) {
    super(reqCxt);
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
    if (reqBody.type === 'HW') {
      await this.trustAdc(reqBody);
    }

    try {
      return new Response(Adc, await this.adcRepository.create(reqBody));
    } catch (e) {
      throw new HttpErrors.UnprocessableEntity(e.message);
    }
  }

  async trustAdc(adc: Partial<Adc>): Promise<void> {
    if (!adc.management || !adc.management.ipAddress) {
      throw new HttpErrors.BadRequest(
        'IP address and admin passphrase are required to trust ADC hardware',
      );
    }

    let body: TrustedDeviceRequest = {
      devices: [
        {
          targetHost: adc.management.ipAddress,
          targetPort: adc.management.tcpPort || 443,
          //TODO: Need away to input admin password of BIG-IP HW
          targetUsername: 'admin',
          targetPassphrase: 'admin',
        },
      ],
    };

    let devices: TrustedDevice[];

    try {
      devices = (await this.trustedDeviceService.trust(
        ASG_HOST,
        ASG_PORT,
        body,
      )).devices;
    } catch (e) {
      //TODO: Request TrustedDevices to hide admin passphrase in error message
      throw new HttpErrors.UnprocessableEntity(e.message);
    }

    //Wait until trusted state become ACTIVE
    let retries = 0;
    while (retries < 15) {
      if (devices.length !== 1) {
        throw new HttpErrors.UnprocessableEntity(
          'Trusting device fails: Response size is ' + devices.length,
        );
      } else {
        adc.trustedDeviceId = devices[0].targetUUID;
        if (devices[0].state === 'ACTIVE') {
          break;
        } else if (
          devices[0].state === 'ERROR' ||
          devices[0].state === 'UNDISCOVERED'
        ) {
          throw new HttpErrors.UnprocessableEntity(
            'Trusting device fails: Device state is ' + devices[0].state,
          );
        }
      }

      await sleep(1000);
      retries++;

      try {
        devices = (await this.trustedDeviceService.query(
          ASG_HOST,
          ASG_PORT,
          adc.trustedDeviceId,
        )).devices;
      } catch (e) {
        throw new HttpErrors.UnprocessableEntity(e.message);
      }
    }

    if (retries >= 15) {
      throw new HttpErrors.UnprocessableEntity(
        'Trusting ADC' + adc.id + ' timeout',
      );
    }
  }

  async untrustAdc(adc: Adc): Promise<void> {
    if (!adc.trustedDeviceId) {
      return;
    }

    let devices: TrustedDevice[];

    try {
      devices = (await this.trustedDeviceService.untrust(
        ASG_HOST,
        ASG_PORT,
        adc.trustedDeviceId,
      )).devices;
    } catch (e) {
      throw new HttpErrors.UnprocessableEntity(e.message);
    }

    if (devices.length !== 1) {
      throw new HttpErrors.UnprocessableEntity(
        'Untrusting device fails: Response size is ' + devices.length,
      );
    }

    if (devices[0].state !== 'DELETING') {
      throw new HttpErrors.UnprocessableEntity(
        'Untrusting device fails: Device state is ' + devices[0].state,
      );
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

    if (adc.type === 'HW') {
      await this.untrustAdc(adc);
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

    switch (Object.keys(actionBody)[0]) {
      case 'create':
        if (adc.status !== 'NONE' && adc.status !== 'POWERERR')
          throw new HttpErrors.BadRequest(
            `Adc status is ' ${
              adc.status
            }. Cannot repeat 'create' on the same ADC.`,
          );

        this.createOn(adc, addonReq);
        return {id: adc.id};

      case 'delete':
        this.deleteOn(adc, addonReq);
        return {id: adc.id};

      case 'setup':
        this.setupOn(adc, addonReq);
        return {id: adc.id};

      default:
        throw new HttpErrors.BadRequest(
          'Not supported: ' + Object.keys(actionBody)[0],
        );
    }
  }

  private async setupOn(adc: Adc, addon: AddonReqValues): Promise<void> {
    let bigipMgr = await BigIpManager.instanlize({
      username: adc.management!.username,
      password: adc.management!.password,
      ipAddr: adc.management!.ipAddress,
      port: adc.management!.tcpPort,
    });
    let bigipReady = async (): Promise<boolean> => {
      return await bigipMgr.getSys().then(() => {
        return true;
      });
    };
    await checkAndWait(bigipReady, 240).then(
      async () => {
        await this.serialize(adc, {status: 'ONBOARDING'});
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

            let bigipOboarded = async (): Promise<boolean> => {
              let hostname = await bigipMgr.getHostname();
              this.logger.debug(`bigip hostname: ${hostname}`);
              await bigipMgr.getLicense();

              return hostname === doBody.declaration.Common!.hostname!;
            };

            await checkAndWait(bigipOboarded, 240).then(
              async () => {
                await this.serialize(adc, {status: 'ONBOARDED'});
              },
              async () => {
                await this.serialize(adc, {
                  status: 'ONBOARDERR',
                  lastErr:
                    `ONBOARDERR: The onboarding took too long time to finish: timeout. ` +
                    `Check more details from log.` +
                    `Checking condition: ${bigipOboarded.toString()}`,
                });
              },
            );
          },
          async reason => {
            await this.serialize(adc, {
              status: 'ONBOARDERR',
              lastErr: `ONBOARDERR: ${reason}`,
            });
          },
        );
      },
      async () => {
        let errmsg =
          'bigip is not ready after waiting timeout. Cannot go forwards';
        this.logger.error(errmsg);
        await this.serialize(adc, {
          status: 'ONBOARDERR',
          lastErr: `ONBOARDERR: ${errmsg}`,
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
      await this.serialize(adc, {status: 'POWERING'})
        .then(async () => await this.cNet(adc, addon))
        .then(async () => await this.cSvr(adc, addon));
      await this.serialize(adc, {status: 'POWERON'});
    } catch (error) {
      await this.serialize(adc, {
        status: 'POWERERR',
        lastErr: `POWERERR: ${error.message}`,
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
      this.serialize(adc, {status: 'RECLAIMING'});
      for (let f of ['trust', 'license', 'vm', 'network']) {
        await reclaimFuncs[f]();
      }
      this.serialize(adc, {status: 'RECLAIMED'});
    } catch (error) {
      this.logger.error(`Reclaiming fails: ${error.message}`);
      this.serialize(adc, {
        status: 'RECLAIMERR',
        lastErr: `RECLAIMERR: ${error.message}; Please try again.`,
      });
    }
  }
}

type AddonReqValues = {
  userToken: string;
  tenantId: string;
};
