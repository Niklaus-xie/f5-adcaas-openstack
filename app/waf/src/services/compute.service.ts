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
import {inject, Provider, CoreBindings} from '@loopback/core';
import {OpenstackDataSource} from '../datasources';
import {RestApplication} from '@loopback/rest';
import {factory} from '../log4ts';
import {WafBindingKeys} from '../keys';

export interface ComputeService {
  v2CreateServer(
    url: string,
    userToken: string,
    serversRequestBody: object,
  ): Promise<object>;
  v2VirtualServerDetail(url: string, userToken: string): Promise<object>;
  v2DeleteServer(url: string, userToken: string): Promise<object>;
}

export class ComputeServiceProvider implements Provider<ComputeService> {
  constructor(
    // openstack must match the name property in the datasource json file
    @inject('datasources.openstack')
    protected dataSource: OpenstackDataSource = new OpenstackDataSource(),
  ) {}

  value(): Promise<ComputeService> {
    return getService(this.dataSource);
  }
}

export abstract class ComputeManager {
  protected meta: {version: string} = {version: 'abstract'};

  // @inject('services.ComputeService')
  protected computeService: ComputeService;

  protected logger = factory.getLogger(
    'compute.process.ComputeManager.' + this.meta.version,
  );

  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE)
    protected application: RestApplication,
  ) {}

  abstract createServer(
    userToken: string,
    serversParams: ServersParams,
  ): Promise<string>;

  abstract deleteServer(
    userToken: string,
    serverId: string,
    tenantId: string,
  ): Promise<void>;

  abstract getServerDetail(
    userToken: string,
    serverId: string,
    tenantId?: string,
  ): Promise<ServerDetail>;

  async bindComputeService(): Promise<ComputeManager> {
    // NOTE: define abstract member functions when we plan to do dynamic selection
    // between compute v2 and v3.
    // abstract createVirtualServer(): Promise<object>;
    // abstract queryVSState(serverId: string): Promise<object>;

    // TODO: use bind/inject to use bindComputeService:
    // @inject('services.bindComputeService') works differently within/outside
    // of Controller. It doesn't work outside of Controller. So here we make
    // call to Provider explicitly.
    await new ComputeServiceProvider().value().then(cmptServ => {
      this.computeService = cmptServ;
    });

    return Promise.resolve(this);
  }
}

export class ComputeManagerV2 extends ComputeManager {
  protected meta: {version: string} = {version: 'v2'};

  async createServer(
    userToken: string,
    serversParams: ServersParams,
  ): Promise<string> {
    try {
      let adminToken = await this.application.get(
        WafBindingKeys.KeySolvedAdminToken,
      );

      return await Promise.all([
        adminToken.epServers(serversParams.userTenantId),
        this.assembleRequestBody(serversParams),
      ])
        .then(([url, reqBody]) => {
          return this.computeService.v2CreateServer(url, userToken, reqBody);
        })
        .then(serversResponse => {
          const obj = JSON.parse(JSON.stringify(serversResponse))['body'][0];
          this.logger.debug('Created server: ' + JSON.stringify(obj));
          return Promise.resolve(obj['server']['id']);
        });
    } catch (error) {
      let newErr = new Error('Failed to create server.');
      newErr.message += '\n' + error.message;
      newErr.stack += '\n' + error.stack;
      throw newErr;
    }
  }

  async deleteServer(
    userToken: string,
    serverId: string,
    tenantId: string,
  ): Promise<void> {
    let adminToken = await this.application.get(
      WafBindingKeys.KeySolvedAdminToken,
    );
    let url = adminToken.epServers(tenantId) + `/${serverId}`;

    await this.computeService.v2DeleteServer(url, userToken).then(resp => {
      this.logger.debug(`Deleted server: ${serverId}`);
    });
  }

  async getServerDetail(
    userToken: string,
    serverId: string,
    tenantId?: string,
  ): Promise<ServerDetail> {
    if (!tenantId) throw new Error('tenantId is required for compute v2.');

    let adminToken = await this.application.get(
      WafBindingKeys.KeySolvedAdminToken,
    );

    let url = adminToken.epServers(tenantId) + '/' + serverId;

    return await this.computeService
      .v2VirtualServerDetail(url, userToken)
      .then(response => {
        return this.parseDetailResponse(response);
      });
  }

  async parseDetailResponse(response: object): Promise<ServerDetail> {
    const serverJson = JSON.parse(JSON.stringify(response))['body'][0][
      'server'
    ];

    let serverDetail: ServerDetail = {
      addresses: serverJson['addresses'], // TODO: key not exists??
      createdAt: serverJson['created'],
      id: serverJson['id'],
      name: serverJson['name'],
      powerState: serverJson['OS-EXT-STS:power_state'],
      tenantId: serverJson['tenant_id'],
      userId: serverJson['user_id'],
      vmState: serverJson['OS-EXT-STS:vm_state'], // TODO: OS-EXT-STS:vm_state or state?
    };

    return Promise.resolve(serverDetail);
  }

  async assembleRequestBody(
    serversParams: ServersParams,
  ): Promise<ServersRequestBody> {
    let serversRequestBody: ServersRequestBody = {
      server: {
        flavorRef: serversParams.flavorRef,
        imageRef: serversParams.imageRef,
        networks: [{uuid: ''}],
        security_groups: [{name: serversParams.securityGroupName}],
        name: serversParams.vmName,
        'OS-DCF:diskConfig': 'AUTO',
        config_drive: true,
      },
    };
    if (serversParams.availableZoneName)
      serversRequestBody.server.available_zone =
        serversParams.availableZoneName;
    if (serversParams.userData)
      serversRequestBody.server.user_data = serversParams.userData;

    serversRequestBody.server.networks.shift();
    if (serversParams.networkId) {
      // TODO: remove network uuid support?
      serversRequestBody.server.networks.push({uuid: serversParams.networkId});
    } else if (serversParams.ports) {
      for (let p of serversParams.ports) {
        serversRequestBody.server.networks.push({port: p});
      }
    } else throw new Error('Either network uuid or port id should be');
    return Promise.resolve(serversRequestBody);
  }
}

// TODO: "type": "computev3", -- to support compute v3.
//export class ComputeManagerV3 extends ComputeManager { }

class ServersRequestBody {
  server: {
    networks: {uuid?: string; port?: string; fixed_ip?: string}[];
    name: string;

    imageRef: string;
    flavorRef: string;
    available_zone?: string;
    'OS-DCF:diskConfig': 'AUTO';
    metadata?: {
      [key: string]: string;
    };
    security_groups: [{name: string}];

    user_data?: string;
    config_drive: boolean;
  };
}

export class ServersParams {
  userTenantId: string;
  networkId?: string;
  ports?: string[];
  vmName: string;

  imageRef: string;
  flavorRef: string;
  securityGroupName: string;
  userData?: string;
  availableZoneName?: string;
  metadata?: {[key: string]: string};
  fixedIp?: string;
}

export class ServerDetail {
  vmState: string;
  powerState: number; // TODO: enum it to string?
  addresses?: object; // TODO: expends 'object'.
  createdAt: string;
  id: string;
  name: string;
  tenantId: string;
  userId: string;
}
