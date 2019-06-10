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

import {inject, CoreBindings} from '@loopback/core';
import {ServersParams} from '../../../src/services';
import {PortCreationParams} from '../../../src/services/network.service';
import {factory} from '../../../src/log4ts';
import {get, requestBody, RestApplication} from '@loopback/rest';
import {WafBindingKeys} from '../../../src/keys';
import {MockBaseController} from './mocks/mock.base.controller';

class Environs {
  [key: string]: string | undefined;
}

class Parameters {
  // for adminToken
  // none

  // for validateUserToken
  adminToken: string;
  userToken: string;
  tenantId: string;

  // for createVirtualServer
  // userToken
  //tenantId: string;
  networkId: string;
  imageRef: string;
  flavorRef: string;
  securityGroupName: string;
  vmName: string;

  // for createVirtual Server with port
  portId: string;
  // tenantId: string;
  // imageRef: string;
  // flavorRef: string;
  // securityGroupName: string;
  // vmName: string;

  // for virtualServerDetail
  serverId: string;
  // userToken
}

export class RequestBody {
  env: Environs;
  param: Parameters;
}

export class OpenstackController extends MockBaseController {
  private logger = factory.getLogger('tests.openstack');

  constructor(
    // @inject('services.IdentityService')
    // private identityService: IdentityService,
    @inject(CoreBindings.APPLICATION_INSTANCE)
    private application: RestApplication,
  ) {
    super();
    // Need to unbind it for re-auth admin token from start.
    this.application.unbind(WafBindingKeys.KeyInternalAdminTokenSingleton);
  }

  @get('/openstack/adminAuthToken')
  async adminAuthToken(@requestBody() reqBody: RequestBody): Promise<object> {
    return this.tryRunWithEnvs(reqBody.env, async () => {
      return await this.application.get(WafBindingKeys.KeySolvedAdminToken);
    });
  }

  @get('/openstack/validateUserToken')
  async validateUserToken(
    @requestBody() reqBody: RequestBody,
  ): Promise<object> {
    return this.tryRunWithEnvs(reqBody.env, async () => {
      const authWithOSIdentity = await this.application.get(
        WafBindingKeys.KeyAuthWithOSIdentity,
      );

      return await authWithOSIdentity.validateUserToken(
        reqBody.param.userToken,
        reqBody.param.tenantId,
      );
    });
  }

  @get('/openstack/createVirtualServer')
  async createVirtualServer(
    @requestBody() reqBody: RequestBody,
  ): Promise<object> {
    return this.tryRunWithEnvs(reqBody.env, async () => {
      const computeMgr = await this.application.get(
        WafBindingKeys.KeyComputeManager,
      );

      let serversParams: ServersParams = {
        userTenantId: reqBody.param.tenantId,
        networkId: reqBody.param.networkId,
        imageRef: reqBody.param.imageRef,
        flavorRef: reqBody.param.flavorRef,
        securityGroupName: reqBody.param.securityGroupName,
        vmName: reqBody.param.vmName,
        ports: [reqBody.param.portId],
      };

      // Need to generate admin token to retrieve catalog.
      return {
        id: await computeMgr.createServer(
          reqBody.param.userToken,
          serversParams,
        ),
      };
    });
  }

  @get('/openstack/virtualServerDetail')
  async virtualServerDetail(
    @requestBody() reqBody: RequestBody,
  ): Promise<object> {
    return this.tryRunWithEnvs(reqBody.env, async () => {
      const computeMgr = await this.application.get(
        WafBindingKeys.KeyComputeManager,
      );

      return computeMgr.getServerDetail(
        reqBody.param.userToken,
        reqBody.param.serverId,
        reqBody.param.tenantId,
      );
    });
  }

  @get('/openstack/createPort')
  async createPort(@requestBody() reqBody: RequestBody): Promise<object> {
    return this.tryRunWithEnvs(reqBody.env, async () => {
      const networkDriver = await this.application.get(
        WafBindingKeys.KeyNetworkDriver,
      );

      let portsParams: PortCreationParams = {
        networkId: reqBody.param.networkId,
        name: 'adcId-',
      };
      let port = await networkDriver.createPort(
        reqBody.param.userToken,
        portsParams,
      );
      return Promise.resolve(port);
    });
  }

  // TODO: implement it when necessary.
  // @get('/openstack/portDetail')
  // async getPortDetail(
  //   @requestBody() reqBody: RequestBody): Promise<object> {

  // }

  overrideEnvirons(envs: Environs): Environs {
    let oldEnvs: Environs = {};

    let envlist = [
      'OS_AUTH_URL',
      'OS_USERNAME',
      'OS_PASSWORD',
      'OS_TENANT_ID',
      'OS_DOMAIN_NAME',
      'OS_AVAILABLE_ZONE',
    ];
    for (let n of envlist) {
      oldEnvs[n] = process.env[n];
      process.env[n] = envs[n];
    }
    return oldEnvs;
  }

  async tryRunWithEnvs(
    envs: Environs,
    func: (...args: object[]) => Promise<object>,
    ...args: object[]
  ): Promise<object> {
    const initEnvs = this.overrideEnvirons(envs);
    const funcName = (() => {
      if (!func.name) return '<anonymous>';
      else return func.name;
    })();

    try {
      this.logger.debug('Function: ' + funcName);
      this.logger.debug('Arguments: ' + JSON.stringify(args));

      const rlt = await func(args);
      this.logger.debug('Done: ' + JSON.stringify(rlt));

      return rlt;
    } catch (error) {
      this.logger.debug('Failed: ' + error.message);
      return {
        message: error.message.split('\n'),
        stack: error.stack.split('\n'),
      };
    } finally {
      this.overrideEnvirons(initEnvs);
    }
  }
}
