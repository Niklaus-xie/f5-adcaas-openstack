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

import {getService} from '@loopback/service-proxy';
import {inject, Provider} from '@loopback/core';
import {DoDataSource} from '../datasources';
import {Adc} from '../models';
import {factory} from '../log4ts';
import {BigIpManager} from './bigip.service';
import {RestApplication} from '@loopback/rest';
import {WafBindingKeys} from '../keys';
import {AddonReqValues} from '../controllers';
const ip = require('ip');

export interface DOService {
  doRest(
    method: string,
    url: string,
    headers: object,
    body: object,
  ): Promise<object>;
}

export class DOServiceProvider implements Provider<DOService> {
  constructor(
    // do must match the name property in the datasource json file
    @inject('datasources.do')
    protected dataSource: DoDataSource = new DoDataSource(),
  ) {}

  value(): Promise<DOService> {
    return getService(this.dataSource);
  }
}

export class OnboardingManager {
  private doService: DOService;
  private logger = factory.getLogger('services.onboarding.manager');
  private application: RestApplication;
  public config: {
    endpoint: string;
    async: boolean;
    timeout: number;
    licPool: {
      host: string;
      username: string;
      password: string;
      poolName: string;
    };
  };

  static async instanlize(
    adc: Adc,
    app: RestApplication,
    config: object = {},
  ): Promise<OnboardingManager> {
    let doS = await new DOServiceProvider().value();
    return new OnboardingManager(adc, doS, app, config);
  }

  constructor(adc: Adc, doS: DOService, app: RestApplication, config: object) {
    let cnct = adc.management.connection!;
    let ipAddr = cnct.ipAddress;
    let port = cnct.tcpPort;
    let endpointUrl = `https://${ipAddr}:${port}`;

    this.doService = doS;
    this.application = app;

    let expectedEmpty = [];
    for (let n of [
      'DO_BIGIQ_HOST',
      'DO_BIGIQ_USERNAME',
      'DO_BIGIQ_PASSWORD',
      'DO_BIGIQ_POOL',
    ]) {
      if (!process.env[n] || process.env[n] === '') {
        expectedEmpty.push(n);
      }
    }
    if (expectedEmpty.length !== 0)
      throw new Error(
        'Environments should be set: ' + JSON.stringify(expectedEmpty),
      );

    this.config = {
      endpoint: endpointUrl || 'https://localhost:9443',
      async: true,
      timeout: 900, // from onboarding prompt: should be <= 900
      licPool: {
        host: process.env.DO_BIGIQ_HOST!,
        username: process.env.DO_BIGIQ_USERNAME!,
        password: process.env.DO_BIGIQ_PASSWORD!,
        poolName: process.env.DO_BIGIQ_POOL!,
      },
    };
    Object.assign(this.config, config);
  }

  private assembleHandlers: {[key: string]: Function} = {
    license: (
      target: TypeDOClassDeclaration['Common'],
      obData: Adc,
      additionalInfo?: object,
    ): TypeDOClassDeclaration['Common'] => {
      try {
        let onboarding = JSON.parse(JSON.stringify(additionalInfo))[
          'onboarding'
        ];
        let keyName = onboarding ? 'licensePool' : 'revokeFrom';

        let licData = {};
        if (obData.license) {
          licData = {
            class: 'License',
            licenseType: 'regKey',
            regKey: obData.license!,
            overwrite: true,
          };
        } else {
          licData = {
            class: 'License',
            licenseType: 'licensePool',
            bigIqHost: this.config.licPool.host,
            bigIqUsername: this.config.licPool.username,
            bigIqPassword: this.config.licPool.password,
            [keyName]: this.config.licPool.poolName,
            reachable: true,
            bigIpUsername: obData.management.connection!.username,
            bigIpPassword: obData.management.connection!.password,
          };
        }
        this.logger.debug('Add new license: operation: ' + keyName);
        return Object.assign(target, {myLicense: licData});
      } catch (error) {
        this.logger.debug(`No license found: ${error.message}`);
        return target;
      }
    },

    provisions: (
      target: TypeDOClassDeclaration['Common'],
      obData: Adc,
      additionalInfo?: object,
    ): TypeDOClassDeclaration['Common'] => {
      try {
        // TODO: make it user defined(define it in adc.model)
        let provData = {
          class: 'Provision',
          ltm: 'nominal',
          asm: 'nominal',
        };

        this.logger.debug('Add new provision.');
        return Object.assign(target, {myProvision: provData});
      } catch (error) {
        this.logger.debug(`No provision found: ${error.message}`);
        return target;
      }
    },

    dns: (
      target: TypeDOClassDeclaration['Common'],
      obData: Adc,
      additionalInfo?: object,
    ): TypeDOClassDeclaration['Common'] => {
      try {
        // TODO: make it user defined(define it in adc.model)
        let dnsData = {
          class: 'DNS',
          nameServers: ['8.8.8.8'],
          search: ['openstack.local'],
        };

        this.logger.debug('Add new dns.');
        return Object.assign(target, {myDns: dnsData});
      } catch (error) {
        this.logger.debug(`No dns found: ${error.message}`);
        return target;
      }
    },

    ntp: (
      target: TypeDOClassDeclaration['Common'],
      obData: Adc,
      additionalInfo?: object,
    ) => {
      try {
        let ntpData = {
          class: 'NTP',
          servers: ['0.pool.ntp.org', '1.pool.ntp.org', '2.pool.ntp.org'],
          timezone: 'UTC',
        };
        this.logger.debug('Add new ntp.');
        return Object.assign(target, {myNtp: ntpData});
      } catch (error) {
        this.logger.debug('No ntp found.');
        return target;
      }
    },

    vlans: (
      target: TypeDOClassDeclaration['Common'],
      obData: Adc,
      additionalInfo?: object,
    ): TypeDOClassDeclaration['Common'] => {
      for (let n of Object.keys(obData.networks)) {
        // from onboarding prompt:
        //  "01070607:3: The management interface cannot be configured as a(n) vlan member."
        if (obData.networks[n].type === 'mgmt') continue;

        try {
          let intfs = JSON.parse(JSON.stringify(additionalInfo))['interfaces'];
          if (!(obData.management.networks[n].macAddr! in intfs)) {
            this.logger.error(
              `${obData.management.networks[n]
                .macAddr!} not found in bigip device.`,
            );
          } else {
            let vlanData = {
              class: 'VLAN',
              interfaces: [
                {
                  name: intfs[obData.management.networks[n].macAddr!].name,
                  tagged: false,
                },
              ],
              // mtu: TODO: get network information from openstack: mtu.
            };
            this.logger.debug('Add new vlan: ' + n);
            target = Object.assign(target, {['vlan-' + n]: vlanData});
          }
        } catch (error) {
          this.logger.debug(`vlan  vlan-${n} not added: ${error.message}`);
        }
      }

      return target;
    },

    selfips: (
      target: TypeDOClassDeclaration['Common'],
      obData: Adc,
      additionalInfo?: object,
    ): TypeDOClassDeclaration['Common'] => {
      let subs = JSON.parse(JSON.stringify(additionalInfo))['subnets'];
      for (let n of Object.keys(obData.networks)) {
        if (obData.networks[n].type === 'mgmt') continue;

        for (let s of Object.keys(subs)) {
          if (obData.management.networks[n].macAddr! !== s) continue;
          try {
            let selfipData = {
              class: 'SelfIp',
              vlan: 'vlan-' + n,
              address:
                obData.management.networks[n].fixedIp! +
                '/' +
                subs[s]['masknum'],
            };
            this.logger.debug('Add new selfip: ' + n);
            target = Object.assign(target, {['selfip-' + n]: selfipData});
          } catch (error) {
            this.logger.debug(`selfip selfip-${n} not added: ${error.message}`);
          }
        }
      }

      return target;
    },

    routes: (
      target: TypeDOClassDeclaration['Common'],
      obData: Adc,
      additionalInfo?: object,
    ): TypeDOClassDeclaration['Common'] => {
      for (let n of Object.keys(obData.networks)) {
        if (obData.networks[n].type !== 'ext') continue;

        let subs = JSON.parse(JSON.stringify(additionalInfo))['subnets'];
        for (let s of Object.keys(subs)) {
          if (obData.management.networks[n].macAddr! !== s) continue;
          try {
            let routeData = {
              class: 'Route',
              gw: subs[s].gateway,
              network: 'default',
            };
            this.logger.debug('Add new route: ' + n);
            target = Object.assign(target, {['route-' + n]: routeData});
          } catch (error) {
            this.logger.debug(`route route-${n} not added: ${error.message}`);
          }
        }
      }

      return target;
    },

    configsync: (
      target: TypeDOClassDeclaration['Common'],
      obData: Adc,
      additionalInfo?: object,
    ): TypeDOClassDeclaration['Common'] => {
      for (let n of Object.keys(obData.networks)) {
        if (obData.networks[n].type === 'ha') {
          try {
            target = Object.assign(target, {
              configsync: {
                class: 'ConfigSync',
                configsyncIp: obData.management.networks[n].fixedIp!,
              },
            });
          } catch (error) {
            this.logger.debug(`configsync not added: ${error.message}`);
          }
          break;
        }
      }
      return target;
    },

    users: (
      target: TypeDOClassDeclaration['Common'],
      obData: Adc,
      additionalInfo?: object,
    ): TypeDOClassDeclaration['Common'] => {
      if (obData.compute.sshKey) {
        let userInfo = {
          class: 'User',
          userType: 'root',
          oldPassword: obData.management.connection!.rootPass,
          newPassword: obData.management.connection!.rootPass,
          keys: [obData.compute.sshKey!],
        };

        this.logger.debug('Add users part.');
        return Object.assign(target, {root: userInfo});
      } else {
        this.logger.debug(`No provision found.`);
        return target;
      }
    },
  };

  async assembleDo(obData: Adc, addon: AddonReqValues): Promise<TypeDOClassDO> {
    let doBody: TypeDOClassDO = {
      class: 'DO',
      targetHost: obData.management.connection!.ipAddress,
      targetPort: obData.management.connection!.tcpPort,
      targetUsername: obData.management.connection!.username,
      targetPassphrase: obData.management.connection!.password,
      targetTimeout: this.config.timeout.toString(),
      declaration: {
        schemaVersion: '1.5.0',
        class: 'Device',
        async: this.config.async,
        label: 'Basic onboarding',
        Common: {
          class: 'Tenant',
          hostname: obData.id + '.f5bigip.local',
        },
      },
    };

    let addonInfo: {[key: string]: object | boolean} = {
      // get bigip interfaces information: name.
      interfaces: await BigIpManager.instanlize({
        username: obData.management.connection!.username,
        password: obData.management.connection!.password,
        ipAddr: obData.management.connection!.ipAddress,
        port: obData.management.connection!.tcpPort,
      }).then(async bigipMgr => {
        return await bigipMgr.getInterfaces();
      }),
      subnets: await this.subnetInfo(obData, addon),
      onboarding: addon.onboarding === true,
    };

    this.logger.debug(
      'Additional information for assembling onboarding body: ' +
        JSON.stringify(addonInfo),
    );
    let objCommon = doBody.declaration.Common;
    for (let nFunc in this.assembleHandlers) {
      objCommon = this.assembleHandlers[nFunc](objCommon, obData, addonInfo);
    }

    doBody.declaration.Common = objCommon;
    this.logger.debug(`Assembled do body: ${JSON.stringify(doBody)}`);
    return doBody;
  }

  private async subnetInfo(adc: Adc, addon: AddonReqValues): Promise<object> {
    let rltObj = {};

    let netDriver = await this.application.get(WafBindingKeys.KeyNetworkDriver);

    for (let net of Object.keys(adc.networks)) {
      let macAddr = adc.management.networks[net].macAddr!;
      let subnetData = await netDriver.getSubnetInfo(
        addon.userToken!,
        adc.networks[net].networkId,
      );
      for (let sub of subnetData) {
        if (
          ip.cidrSubnet(sub.cidr).contains(adc.management.networks[net].fixedIp)
        ) {
          Object.assign(rltObj, {
            [macAddr]: {
              gateway: sub.gatewayIp,
              masknum: sub.cidr.split('/')[1],
            },
          });
          break;
        }
      }
    }
    return rltObj;
  }

  async onboarding(givenDoBody: TypeDOClassDO): Promise<string> {
    // TODO: base64 coding for admin:admin. Modify it later if needed
    let headers = {Authorization: 'Basic YWRtaW46YWRtaW4='};

    return await this.doService
      .doRest(
        'POST',
        this.config.endpoint + '/mgmt/shared/declarative-onboarding',
        headers,
        givenDoBody,
      )
      .then(
        response => {
          let resObj = JSON.parse(JSON.stringify(response));
          return resObj[0]['id'];
        },
        reason => {
          // if onboarding fails.
          let mesg = 'Failed to onboarding device: ' + JSON.stringify(reason);
          this.logger.error(mesg);
          throw new Error(mesg);
        },
      );
  }

  async isDone(doId: string): Promise<boolean> {
    // TODO: base64 coding for admin:admin. Modify it later if needed
    let headers = {Authorization: 'Basic YWRtaW46YWRtaW4='};

    return await this.doService
      .doRest(
        'GET',
        `${this.config.endpoint}/mgmt/shared/declarative-onboarding/task/${doId}`,
        headers,
        {},
      )
      .then(
        response => {
          let resObj = JSON.parse(JSON.stringify(response));
          this.logger.info(`Onboarding task id: ${resObj[0]['id']}`);
          return resObj[0]['result']['code'] === 200;
        },
        reason => {
          // if onboarding fails.
          let mesg = 'Failed to onboarding device: ' + JSON.stringify(reason);
          this.logger.error(mesg);
          throw new Error(mesg);
        },
      );
  }
}

// remote.schema
type TypeDOClassDO = {
  class: 'DO';
  targetHost?: string;
  targetPort?: number;
  targetUsername?: string;
  targetPassphrase?: string;
  targetTokens?: string | {[key: string]: string};
  targetTimeout?: string;
  declaration: TypeDOClassDeclaration;
};

// base.schema
type TypeDOClassDeclaration = {
  schemaVersion: string; // "1.3.0", "1.2.0", "1.1.0", "1.0.0"
  class: 'Device';
  async?: boolean;
  label?: string;
  Credentials?: {tokens: string} | {username: string; password: string}[];
  Common?: {
    class: 'Tenant';
    hostname?: string;
    [key: string]:
      | undefined
      | string
      | TypeDOClassSystemSchema
      | TypeDOClassNetworkSchema
      | TypeDOClassDSCSchema;
  };
  result?: {
    class: 'Result';
    code: 'OK' | 'ERROR';
    message?: string;
  };
};

// dsc.schema
type TypeDOClassDSCSchema =
  | TypeDOClassConfigSync
  | TypeDOClassFailoverUnicast
  | TypeDOClassDeviceGroup
  | TypeDOClassDeviceTrust;

type TypeDOClassConfigSync = {
  class: 'ConfigSync';
  configsyncIp: string;
};

type TypeDOClassFailoverUnicast = {
  class: 'FailoverUnicast';
  address: string;
  port?: number;
};

type TypeDOClassDeviceGroup = {
  /**
   *
    "if": { "properties": { "type": { "const": "sync-failover" } } },
    "then": {
        "if": { "properties": { "autoSync": { "const": true } } },
        "then": {
            "properties": {
                "fullLoadOnSync": {
                    "const": false
                }
            }
        }
    },
   */
  class: 'DeviceGroup';
  type: 'sync-failover' | 'sync-only';
  owner?: string;
  members?: string[];
  autoSync?: boolean;
  saveOnAutoSync?: boolean;
  networkFailover?: boolean;
  asmSync?: boolean;
  fullLoadOnSync?: boolean;
};

type TypeDOClassDeviceTrust = {
  class: 'DeviceTrust';
  localUsername: string;
  localPassword: string;
  remoteHost: string;
  remoteUsername: string;
  remotePassword: string;
};

// network.schema

type TypeDOClassNetworkSchema =
  | TypeDOClassVLAN
  | TypeDOClassSelfIp
  | TypeDOClassRoute;

type TypeDOClassVLAN = {class: 'VLAN'} & EntyTypeDOClassVLAN;
type TypeDOClassSelfIp = {class: 'SelfIp'} & EntyTypeDOClassSelfIp;
type TypeDOClassRoute = {class: 'Route'} & EntyTypeDOClassRoute;

// system.schema
type TypeDOClassSystemSchema =
  | TypeDOClassLicense
  | TypeDOClassDbVariables
  | TypeDOClassProvision
  | TypeDOClassDNS
  | TypeDOClassNTP
  | TypeDOClassUser
  | TypeDOClassPartitionAccess;

type TypeDOClassLicense = TypeDOClassRegkeyInfo | TypeDOClassLicensePoolInfo;

type TypeDOClassDbVariables = {
  class: 'DbVariables';
  [key: string]: string | undefined;
};

type TypeDOClassProvision = {
  class: 'Provision';
  // support them on demand.
  // 'afm' | 'am' | 'apm' | 'asm' | 'avr' | 'dos' | 'fps' |
  // 'gtm' | 'ilx' | 'lc' | 'ltm' | 'pem' | 'swg' | 'urldb'
  ltm: 'dedicated' | 'nominal' | 'minimum' | 'none';
  asm: 'dedicated' | 'nominal' | 'minimum' | 'none';
  ilx: 'dedicated' | 'nominal' | 'minimum' | 'none';
};

type TypeDOClassDNS = {
  class: 'DNS';
  nameServers?: string[];
  search?: string[];
};

type TypeDOClassNTP = {
  class: 'NTP';
  servers: string[];
  timezone: string;
};

type TypeDOClassUser = TypeDOClassUserRoot | TypeODClassUserElse;

type TypeDOClassUserRoot = {
  class: 'User';
  userType: 'root';
  newPassword: string;
  oldPassword: string;
  keys: string[];
};

type TypeODClassUserElse = {
  class: 'User';
  userType: string;
  password?: string;
  partitionAccess?: {
    Common: TypeDOClassPartitionAccess;
    'all-partitions': TypeDOClassPartitionAccess;
  };
  shell: 'bash' | 'tmsh' | 'none';
};

type TypeDOClassPartitionAccess = {
  role:
    | 'admin'
    | 'auditor'
    | 'guest'
    | 'manager'
    | 'operator'
    | 'user-manager'
    | 'application-editor'
    | 'certificate-manager'
    | 'irule-manager'
    | 'no-access'
    | 'resource-admin';
};

type TypeDOClassRegkeyInfo = {
  class: 'License';
  licenseType: 'regKey';
  regKey: string;
  addOnKeys?: string[];
  overwrite?: boolean;
};

type TypeDOClassLicensePoolInfo = {
  class: 'License';
  licenseType: 'licensePool';

  reachable?: boolean;

  licensePool?: string;
  hypervisor?: 'aws' | 'azure' | 'gce' | 'vmware' | 'hyperv' | 'kvm' | 'xen';
  bigIpUsername?: string;
  bigIpPassword?: string;

  skuKeyword1?: string;
  skuKeyword2?: string;
  unitOfMeasure?: 'yearly' | 'monthly' | 'daily' | 'hourly';

  overwrite?: boolean;
  revokeFrom?: string | TypeDOClassRevokeFromObject;
  [key: string]:
    | TypeDOClassCommonTypes
    | TypeDOClassbigIqHostInfo
    | TypeDOClassRevokeFromObject;
};

type TypeDOClassbigIqHostInfo = {
  bigIqHost: string;
  bigIqUsername: string;
  bigIqPassword?: string;
  bigIqPasswordUri?: string;
  reachable?: boolean;
};

type TypeDOClassRevokeFromObject = {
  licensePool: string;
  [key: string]: TypeDOClassbigIqHostInfo | string;
};

type TypeDOClassCommonTypes = undefined | string | boolean | number;

export type EntyTypeDOClassSelfIp = {
  address: string;
  vlan: string;
  trafficGroup?: 'traffic-group-local-only' | 'traffic-group-1';
  allowService?: ('all' | 'none' | 'default') | string[];
};

export type EntyTypeDOClassVLAN = {
  interfaces: {
    name: string;
    tagged?: boolean;
  }[];
  mtu?: number;
  tag?: number;
};

export type EntyTypeDOClassRoute = {
  gw: string;
  network?: 'default' | 'default-inet6';
  mtu?: number;
};
