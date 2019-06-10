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

import {expect, Client} from '@loopback/testlab';
import {
  setupRestAppAndClient,
  RestAppAndClient,
  teardownRestAppAndClient,
  TestingApplication,
  RestApplicationPort,
} from '../helpers/test-helper';
import {MockSelfTestController} from '../fixtures/controllers/mocks/mock.selftest.controller';

describe('openstack integration acceptance test', () => {
  let restAppAndClient: RestAppAndClient;
  let client: Client;
  let restApp: TestingApplication;

  before('setup', async () => {
    restAppAndClient = await setupRestAppAndClient(
      RestApplicationPort.RestSelfTest,
      MockSelfTestController,
    );

    client = restAppAndClient.client;
    restApp = restAppAndClient.restApp;
  });
  after('teardown', () => {
    teardownRestAppAndClient(restApp);
  });

  it('mock self test ok', async () => {
    const response = await client
      .get('/test-openstack-simulation-ok')
      .expect(200);
    expect(response.body).to.containDeep({status: 'ok'});
  });
});
