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

import {WafApplication} from '../..';
import {
  createRestAppClient,
  givenHttpServerConfig,
  Client,
} from '@loopback/testlab';
import {testdb_config} from '../fixtures/datasources/testdb.datasource';
import {WafBindingKeys} from '../../src/keys';
import {BootMixin} from '@loopback/boot';
import {ServiceMixin} from '@loopback/service-proxy';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {ApplicationConfig} from '@loopback/core';
import {join} from 'path';
import {MockBaseController} from '../fixtures/controllers/mocks/mock.base.controller';

export enum RestApplicationPort {
  // in order, please.
  SSLDefault = 443,
  RestSelfTest = 2000,
  WafApp = 3000,
  IdentityUser = 5000,
  Onboarding = 8081,
  ASG = 8443,
  Nova = 8774,
  Neutron = 9696,
  SSLCustom = 10443,
  IdentityAdmin = 35357,
}
import {stubLogger, restoreLogger} from './logging.helpers';

let envs: {[key: string]: string} = {
  OS_AUTH_URL: 'http://localhost:35357/v2.0',
  OS_USERNAME: 'wafaas',
  OS_PASSWORD: '91153c85b8dd4147',
  OS_TENANT_ID: '32b8bef6100e4cb0a984a7c1f9027802',
  OS_DOMAIN_NAME: 'Default',
  OS_REGION_NAME: 'RegionOne',
  OS_AVAILABLE_ZONE: 'nova',
  OS_FLOATINGIP_NETWORK_ID: 'a33f84be-e058-482b-9efd-5cef248a6ca4',
  DO_ENDPOINT: 'https://localhost:' + RestApplicationPort.SSLDefault,
  DO_BIGIQ_HOST: '10.250.15.105',
  DO_BIGIQ_USERNAME: 'admin',
  DO_BIGIQ_PASSWORD: 'admin',
  DO_BIGIQ_POOL: 'mykeypool',
  DO_RPM_PACKAGE: '/tmp/f5-declarative-onboarding-1.5.0-11.noarch.rpm',
  ASG_HOST: '127.0.0.1',
  ASG_PORT: `${RestApplicationPort.ASG}`,
};

export async function setupApplication(): Promise<AppWithClient> {
  const app = new WafApplication({
    rest: givenHttpServerConfig({
      host: 'localhost',
      port: RestApplicationPort.WafApp,
    }),
  });

  stubLogger();
  app.bind(WafBindingKeys.KeyDbConfig).to(testdb_config);

  await app.boot();
  await app.start();

  const client = createRestAppClient(app);

  return {wafapp: app, client: client};
}

export async function teardownApplication(
  wafapp: WafApplication,
): Promise<void> {
  restoreLogger();
  return wafapp.stop();
}

export interface AppWithClient {
  wafapp: WafApplication;
  client: Client;
}

export class TestingApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);
    this.projectRoot = join(__dirname, '../../src');
  }
}

export async function setupRestAppAndClient(
  port: number,
  controllerCtor: typeof MockBaseController,
  proto?: string,
): Promise<RestAppAndClient> {
  const restApp = new TestingApplication({
    rest: givenHttpServerConfig({
      port: port,
      host: 'localhost',
      protocol: proto ? proto : 'http',
    }),
  });

  restApp.controller(controllerCtor);

  restApp.bootOptions = {
    controllers: {
      dirs: ['notexists'],
    },
    repositories: {
      dirs: ['repositories'],
      extensions: ['.repository.js'],
      nested: true,
    },
  };

  await restApp.boot();
  await restApp.start();

  const client = createRestAppClient(restApp);
  return {restApp: restApp, client: client};
}

export function teardownRestAppAndClient(app: TestingApplication) {
  app.stop();
}

export interface RestAppAndClient {
  restApp: TestingApplication;
  client: Client;
}

export async function setupEnvs(addonEnvs: {[key: string]: string} = {}) {
  for (let k of Object.keys(envs)) {
    process.env[k] = envs[k];
  }
  for (let k of Object.keys(addonEnvs)) {
    envs[k] = addonEnvs[k];
    process.env[k] = addonEnvs[k];
  }
}

export async function teardownEnvs() {
  for (let k of Object.keys(envs)) {
    delete process.env[k];
  }
}
