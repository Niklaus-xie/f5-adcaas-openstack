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
  post,
  requestBody,
  param,
  get,
  RestBindings,
  RequestContext,
  del,
} from '@loopback/rest';
import {RequestBody} from '../openstack.controller';
import {StubResponses} from '../../datasources/testrest.datasource';
import {MockBaseController} from './mock.base.controller';
import {inject} from '@loopback/core';

export class MockKeyStoneController extends MockBaseController {
  constructor(
    @inject(RestBindings.Http.CONTEXT)
    private ctx: RequestContext,
  ) {
    super();
  }
  @post('/v2.0/tokens')
  async v2AuthToken(@requestBody() reqBody: RequestBody): Promise<object> {
    return ResponseWith['/v2.0/tokens']();
  }

  @get('/v2.0/tokens/{tokenId}')
  async v2ValidateToken(
    @param.path.string('tokenId') tokenId: string,
    @param.query.string('belongsTo') belongsTo: string,
    @requestBody() reqBody: RequestBody,
  ): Promise<object> {
    return ResponseWith['/v2.0/tokens']();
  }

  @post('/v3/auth/tokens')
  async v3AuthToken(@requestBody() reqBody: RequestBody): Promise<object> {
    this.ctx.response.setHeader('X-Subject-Token', ExpectedData.userToken);
    return ResponseWith['/v3/auth/tokens']();
  }

  @get('/v3/auth/tokens')
  async v3ValidateToken(@requestBody() reqBody: RequestBody): Promise<object> {
    this.ctx.response.setHeader('X-Subject-Token', ExpectedData.userToken);
    return ResponseWith['/v3/auth/tokens']();
  }
}

export class MockNovaController extends MockBaseController {
  @post('/v2/{tenantId}/servers')
  async v2CreateServer(
    @param.path.string('tenantId') tenantId: string,
    @requestBody() reqBody: RequestBody,
  ): Promise<object> {
    return ResponseWith['/v2/{tenantId}/servers']();
  }

  @del('/v2/{tenantId}/servers/{serverId}')
  async v2DeleteServer(
    @param.path.string('tenantId') tenantId: string,
    @param.path.string('serverId') serverid: string,
  ): Promise<void> {
    return ResponseWith['DELETE:/v2/{tenantId}/servers/{serverId}']();
  }

  @get('/v2/{tenantId}/servers/{serverId}')
  async v2GetVMDetail(
    @param.path.string('tenantId') tenantId: string,
    @param.path.string('serverId') serverId: string,
    @requestBody() reqBody: RequestBody,
  ): Promise<object> {
    return ResponseWith['/v2/{tenantId}/servers/{serverId}']();
  }
}

export class MockNeutronController extends MockBaseController {
  @post('/v2.0/ports')
  async v2CreatePort(@requestBody() reqBody: RequestBody): Promise<object> {
    return ResponseWith['/v2.0/ports']();
  }

  @del('/v2.0/ports/{portId}')
  async v2DeletePort(
    @param.path.string('portId') portId: string,
  ): Promise<void> {
    return ResponseWith['DELETE:/v2.0/ports/{portId}']();
  }

  @get('/v2.0/subnets')
  async v2GetSubnets(): Promise<object> {
    return ResponseWith['/v2.0/subnets']();
  }
}

let ResponseWith: {[key: string]: Function} = {};

export function ShouldResponseWith(spec: {[key: string]: Function}) {
  ResponseWith = {
    '/v2.0/tokens': StubResponses.v2AuthToken200,
    '/v3/auth/tokens': StubResponses.v3AuthToken200,
    '/v2.0/ports': StubResponses.neutronCreatePort200,
    'DELETE:/v2.0/ports/{portId}': StubResponses.neutronDeletePort200,
    '/v2.0/subnets': StubResponses.neutronGetSubnets200,
    '/v2/{tenantId}/servers': StubResponses.novaCreateVM200,
    'DELETE:/v2/{tenantId}/servers/{serverId}': StubResponses.novaDeleteVM200,
    '/v2/{tenantId}/servers/{serverId}': StubResponses.novaGetVMDetail200,
  };
  Object.assign(ResponseWith, spec);
}

export const ExpectedData = {
  userToken: '8cf3d2447253455385c36254192cc4fe',
  userId: '2d26c96aa0f345eaafc3f5b50d2bbd8e',
  serverId: 'fef1e40c-ed9d-4e10-b10c-d60d3af70623',
  portId: 'fcc768fd-1439-48f2-b2df-6d7e867c86a7',
  vmId: 'f250c956-bdd7-41cd-b3d5-03a79c7d90f8',
  tenantId: 'fdac59f5b20046829ea58720702a74af',
  bigipMgmt: {
    hostname: 'test-asm.example1234.openstack.com',
    macAddr: 'fa:16:3e:a2:25:bc',
    ipAddr: '127.0.0.1',
    ipPoolCIDR: '127.0.0.1/24',
    networkId: '0e51e68c-08f7-4e32-af54-328d29b93467',
  },
  doTaskId: 'fe96c41e-6850-4210-bf3b-1902ad27dff4',
  declarationId: '3cc12f17-a6c7-4884-a119-98b456fe2020',
  memberId: '895cc33f_7af6_4477_adc4_c286908f0e72',
  applicationId: '1c19251d-7e97-411a-8816-6f7a72403707',
};
