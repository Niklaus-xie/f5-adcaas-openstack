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
  TestingApplication,
  setupRestAppAndClient,
  RestApplicationPort,
  teardownRestAppAndClient,
  setupEnvs,
  teardownEnvs,
} from '../helpers/test-helper';
import {
  MockKeyStoneController,
  ShouldResponseWith,
  ExpectedData,
} from '../fixtures/controllers/mocks/mock.openstack.controller';
import {MockSelfTestController} from '../fixtures/controllers/mocks/mock.selftest.controller';
import {Client, expect} from '@loopback/testlab';
import {OpenStackComponent} from '../../src/components';
import {stubLogger, restoreLogger} from '../helpers/logging.helpers';
import {MySequence} from '../../src/sequence';

describe('openstack.identity.test', () => {
  let mockKeystoneApp: TestingApplication;
  let mockKeyStoneClient: Client;

  let testApp: TestingApplication;
  let client: Client;

  before('setup', async () => {
    let mockIdAppClient = await setupRestAppAndClient(
      RestApplicationPort.IdentityAdmin,
      MockKeyStoneController,
    );
    mockKeystoneApp = mockIdAppClient.restApp;
    mockKeyStoneClient = mockIdAppClient.client;

    let restAppAndClient = await setupRestAppAndClient(
      RestApplicationPort.WafApp,
      MockSelfTestController,
    );
    testApp = restAppAndClient.restApp;
    testApp.component(OpenStackComponent);
    testApp.sequence(MySequence);
    client = restAppAndClient.client;

    stubLogger();

    ShouldResponseWith({});
  });

  beforeEach('setup environs', async () => {
    setupEnvs();
  });

  afterEach('teardown environs', async () => {
    teardownEnvs();
  });

  after('teardown', async () => {
    restoreLogger();
    teardownRestAppAndClient(testApp);
    teardownRestAppAndClient(mockKeystoneApp);
  });

  it('test openstack identity mocker is runninng.', async () => {
    let response = await mockKeyStoneClient.post('/v2.0/tokens').expect(200);

    expect(response.body).containDeep({
      access: {
        token: {
          id: ExpectedData.userToken,
        },
      },
    });
  });

  it('no auth to request, PRODUCT_RELEASE is off', async () => {
    delete process.env['PRODUCT_RELEASE'];
    let response = await client
      .get('/test-openstack-simulation-ok')
      .expect(200);

    expect(response.body).containDeep({status: 'ok'});
  });

  it('failed auth to request: no x-auth-token header', async () => {
    process.env.PRODUCT_RELEASE = '1';

    let response = await client
      .get('/test-openstack-simulation-ok')
      .expect(401);

    expect(response.body).containDeep({
      error: {message: 'Unauthorized: invalid X-Auth-Token header.'},
    });
  });

  it('succeed auth to request with x-auth-token header', async () => {
    let response = await client
      .get('/test-openstack-simulation-ok')
      .set('X-Auth-Token', ExpectedData.userToken)
      .send()
      .expect(200);

    expect(response.body).containDeep({status: 'ok'});
  });
});
