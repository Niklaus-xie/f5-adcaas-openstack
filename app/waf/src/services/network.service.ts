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
import {inject, Provider, CoreBindings, Application} from '@loopback/core';
import {OpenstackDataSource} from '../datasources';
import {factory} from '../log4ts';
import {WafBindingKeys} from '../keys';

export interface NetworkService {
  v2CreatePort(
    url: string,
    userToken: string,
    body: PortsRequest,
  ): Promise<object>;
  v2GetSubnets(url: string, userToken: string): Promise<object>;
  v2DeletePort(url: string, userToken: string): Promise<object>;
}

export class NetworkServiceProvider implements Provider<NetworkService> {
  constructor(
    // openstack must match the name property in the datasource json file
    @inject('datasources.openstack')
    protected dataSource: OpenstackDataSource = new OpenstackDataSource(),
  ) {}

  value(): Promise<NetworkService> {
    return getService(this.dataSource);
  }
}

export class NetworkDriver {
  protected meta: {version: string} = {version: 'v2.0'};

  // @inject('services.ComputeService')
  protected networkService: NetworkService;

  protected logger = factory.getLogger(
    'compute.process.NetworkDriver.' + this.meta.version,
  );

  constructor(
    @inject(CoreBindings.APPLICATION_INSTANCE)
    protected application: Application,
  ) {}

  async bindNetworkService(): Promise<NetworkDriver> {
    // TODO: use bind/inject to use bindComputeService:
    // @inject('services.bindComputeService') works differently within/outside
    // of Controller. It doesn't work outside of Controller. So here we make
    // call to Provider explicitly.
    await new NetworkServiceProvider().value().then(netServ => {
      this.networkService = netServ;
    });
    return Promise.resolve(this);
  }

  async createPort(
    userToken: string,
    portParams: PortCreationParams,
  ): Promise<PortResponse> {
    let adminToken = await this.application.get(
      WafBindingKeys.KeySolvedAdminToken,
    );

    let url = adminToken.epPorts();

    let body: PortsRequest = {
      port: {
        network_id: portParams.networkId,
      },
    };
    if (portParams.fixedIp) {
      body.port.fixed_ips = [{ip_address: portParams.fixedIp}];
    }

    body.port.name = 'f5-' + portParams.name;

    return await this.networkService
      .v2CreatePort(url, userToken, body)
      .then(response => {
        const respJson = JSON.parse(JSON.stringify(response))['body'][0];
        const portResp: PortResponse = {
          id: respJson['port']['id'],
          fixedIp: respJson['port']['fixed_ips'][0]['ip_address'],
          macAddr: respJson['port']['mac_address'],
        };
        return portResp;
      });
  }

  async deletePort(userToken: string, portId: string): Promise<void> {
    let adminToken = await this.application.get(
      WafBindingKeys.KeySolvedAdminToken,
    );

    let url = adminToken.epPorts() + `/${portId}`;
    await this.networkService.v2DeletePort(url, userToken);
  }

  async getSubnetInfo(
    userToken: string,
    networkId: string,
  ): Promise<SubnetInfo[]> {
    let adminToken = await this.application.get(
      WafBindingKeys.KeySolvedAdminToken,
    );

    let url = adminToken.epSubnets() + '?network_id=' + networkId;
    return await this.networkService
      .v2GetSubnets(url, userToken)
      .then(response => {
        this.logger.debug(
          'access ' + url + ' response: ' + JSON.stringify(response),
        );
        let resp = JSON.parse(JSON.stringify(response))['body'][0]['subnets'];
        let rlt: SubnetInfo[] = [];
        for (let n of resp) {
          let s: SubnetInfo = {
            gatewayIp: n.gateway_ip,
            subnetId: n.id,
            networkId: n.network_id,
            cidr: n.cidr,
            ipVersion: n.ip_version,
          };
          rlt.push(s);
        }
        return rlt;
      });
  }

  //async createFloatingIp() { }
}

type PortsRequest = {
  port: {
    network_id: string;
    name?: string;
    admin_state_up?: boolean;
    tenent_id?: string;
    mac_address?: string;
    fixed_ips?: {
      ip_address?: string;
      subnet_id?: string;
    }[];
    'binding:vnic_type'?:
      | 'normal'
      | 'macvtap'
      | 'direct'
      | 'baremetal'
      | 'direct-physical'
      | 'virtio-forwarder'
      | 'smart-nic';
    allowed_address_pairs?: object[]; // TODO: investigate it for what it does do.
  };
};

export class PortCreationParams {
  networkId: string;
  fixedIp?: string;
  name: string;
}

export type PortResponse = {
  id: string;
  fixedIp: string;
  macAddr: string;
};

export type SubnetInfo = {
  gatewayIp: string;
  subnetId: string;
  networkId: string;
  ipVersion: number;
  cidr: string;
};
