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
import {ASGDataSource} from '../datasources';
import {factory} from '../log4ts';

const ASG_HOST: string = process.env.ASG_HOST || 'localhost';
const ASG_PORT: number = Number(process.env.ASG_PORT) || 8443;
const AS3_RPM_URL: string =
  process.env.AS3_RPM_URL ||
  'https://github.com/F5Networks/f5-appsvcs-extension/releases/download/v3.10.0/f5-appsvcs-3.10.0-5.noarch.rpm';

type TrustedDeviceInfo = {
  targetHost: string;
  targetPort: number;
  targetUsername?: string;
  targetPassphrase?: string;
};

export type TrustedDeviceRequest = {
  devices: TrustedDeviceInfo[];
};

export type TrustedDevice = {
  targetUUID: string;
  targetHost: string;
  targetPort: number;
  state: string;
  targetHostname: string;
  targetVersion: string;
};

export type TrustedDevices = {
  devices: TrustedDevice[];
};

export type TrustedExtension = {
  name: string;
  state: string;
  rpmFile: string;
  downloadUrl: string;
  packageName: string;
  version: string;
  release: string;
  arch: string;
  tags: string[];
};

export type TrustedExtensions = TrustedExtension[];

export type WafpolicyUrlRequest = {
  url: string;
  targetUUID: string;
  targetPolicyName: string;
};

export type WafpolicyResponse = [
  {
    id: string;
    name: string;
    enforcementMode: string;
    lastChanged: string;
    lastChange: string;
    state: string;
    path: string;
  },
];

export type WafpolicyResponses = {
  wafpolicies: WafpolicyResponse[];
};

export interface ASGService {
  // this is where you define the Node.js methods that will be
  // mapped to the SOAP operations as stated in the datasource
  // json file.
  trust(host: string, port: number, body: object): Promise<TrustedDevices>;

  queryTrust(
    host: string,
    port: number,
    deviceId: string,
  ): Promise<TrustedDevices>;

  untrust(
    host: string,
    port: number,
    deviceId: string,
  ): Promise<TrustedDevices>;

  queryExtensions(
    host: string,
    port: number,
    deviceId: string,
  ): Promise<TrustedExtensions>;

  install(
    host: string,
    port: number,
    deviceId: string,
    body: object,
  ): Promise<TrustedExtension>;

  uploadWafpolicyByUrl(
    host: string,
    port: number,
    body: object,
  ): Promise<WafpolicyResponse>;

  checkWafpolicyByName(
    host: string,
    port: number,
    trustDeviceId: string,
    wafpolicyName: string,
  ): Promise<WafpolicyResponse>;

  deploy(url: string, body: object): Promise<object>;
}

export class ASGServiceProvider implements Provider<ASGService> {
  constructor(
    // ASG must match the name property in the datasource json file
    @inject('datasources.asg')
    protected dataSource: ASGDataSource = new ASGDataSource(),
  ) {}

  value(): Promise<ASGService> {
    return getService(this.dataSource);
  }
}

export class ASGManager {
  private service: ASGService;
  private logger = factory.getLogger('services.TrustedProxyManager');

  static async instanlize() {
    let svc = await new ASGServiceProvider().value();
    return new ASGManager(svc);
  }

  constructor(svc: ASGService) {
    this.service = svc;
  }

  async trust(
    mgmtIp: string,
    mgmtPort: number,
    username: string,
    password: string,
  ): Promise<TrustedDevice> {
    let body: TrustedDeviceRequest = {
      devices: [
        {
          targetHost: mgmtIp,
          targetPort: mgmtPort,
          targetUsername: username,
          targetPassphrase: password,
        },
      ],
    };

    let devices = (await this.service.trust(ASG_HOST, ASG_PORT, body)).devices;

    let expected = ['CREATED', 'PENDING', 'ACTIVE'];

    for (let dev of devices) {
      if (dev.targetHost === mgmtIp && expected.indexOf(dev.state) !== -1) {
        return dev;
      }
    }

    throw new Error('Trusted device response is ' + JSON.stringify(devices));
  }

  async getTrustState(id: string): Promise<string> {
    let devices = (await this.service.queryTrust(ASG_HOST, ASG_PORT, id))
      .devices;

    if (devices.length === 1) {
      return devices[0].state;
    } else {
      throw new Error('Trusted device response size is ' + devices.length);
    }
  }

  async untrust(id: string): Promise<void> {
    let devices = (await this.service.untrust(ASG_HOST, ASG_PORT, id)).devices;

    if (devices.length === 1 && devices[0].state === 'DELETING') {
      return;
    } else {
      throw new Error('Fail to delete trusted device');
    }
  }

  async installAS3(id: string): Promise<void> {
    let body = {
      url: AS3_RPM_URL,
    };

    await this.service.install(ASG_HOST, ASG_PORT, id, body);
  }

  async as3Exists(id: string): Promise<boolean> {
    let exts = await this.service.queryExtensions(ASG_HOST, ASG_PORT, id);

    for (let ext of exts) {
      if (ext.name === 'f5-appsvcs' || ext.rpmFile.startsWith('f5-appsvcs-')) {
        return true;
      }
    }

    return false;
  }

  async getAS3State(id: string): Promise<string> {
    let exts = await this.service.queryExtensions(ASG_HOST, ASG_PORT, id);

    for (let ext of exts) {
      if (ext.name === 'f5-appsvcs' || ext.rpmFile.startsWith('f5-appsvcs-')) {
        return ext.state;
      }
    }

    return 'NONE';
  }

  async wafpolicyUploadByUrl(
    url: string,
    targetUUID: string,
    targetPolicyName: string,
  ): Promise<WafpolicyResponse> {
    let body: WafpolicyUrlRequest = {
      url: url,
      targetUUID: targetUUID,
      targetPolicyName: targetPolicyName,
    };

    return await this.service.uploadWafpolicyByUrl(ASG_HOST, ASG_PORT, body);
  }

  async wafpolicyCheckByName(
    trustDeviceId: string,
    wafpolicyName: string,
  ): Promise<WafpolicyResponse> {
    return await this.service.checkWafpolicyByName(
      ASG_HOST,
      ASG_PORT,
      trustDeviceId,
      wafpolicyName,
    );
  }

  async deploy(ipaddr: string, port: number, body: object): Promise<void> {
    let deployUrl = `https://${ASG_HOST}:${ASG_PORT}/mgmt/shared/TrustedProxy`;
    let deployBody = {
      method: 'Post',
      uri: `https://${ipaddr}:${port}/mgmt/shared/appsvcs/declare`,
      body: body,
    };
    this.logger.debug(`Json to deploy: ${JSON.stringify(deployBody)}`);

    try {
      await this.service.deploy(deployUrl, deployBody).then(response => {
        let resObj = JSON.parse(JSON.stringify(response));
        if (resObj.results[0].code !== 200)
          throw new Error(`Deployment is something wrong: ${response}`);
      });
    } catch (error) {
      throw new Error(JSON.stringify(error));
    }
  }
}
