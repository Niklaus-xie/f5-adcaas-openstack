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

import {Client, expect, toJSON} from '@loopback/testlab';
import {WafApplication} from '../..';
import {
  setupApplication,
  teardownApplication,
  TestingApplication,
  setupRestAppAndClient,
  RestApplicationPort,
  teardownRestAppAndClient,
  setupEnvs,
  teardownEnvs,
} from '../helpers/test-helper';
import {
  givenEmptyDatabase,
  createMonitorObject,
  givenMonitorData,
} from '../helpers/database.helpers';
import {
  ShouldResponseWith,
  MockKeyStoneController,
  ExpectedData,
} from '../fixtures/controllers/mocks/mock.openstack.controller';

describe('MointorController', () => {
  let wafapp: WafApplication;
  let client: Client;
  let mockKeystoneApp: TestingApplication;

  const prefix = '/adcaas/v1';

  before('setupApplication', async () => {
    mockKeystoneApp = await (async () => {
      let {restApp} = await setupRestAppAndClient(
        RestApplicationPort.IdentityAdmin,
        MockKeyStoneController,
      );
      return restApp;
    })();

    ({wafapp, client} = await setupApplication());
    ShouldResponseWith({});
    setupEnvs();
  });

  beforeEach('Empty database', async () => {
    await givenEmptyDatabase(wafapp);
  });

  after(async () => {
    await teardownApplication(wafapp);
    teardownRestAppAndClient(mockKeystoneApp);
    teardownEnvs();
  });

  it('post ' + prefix + '/monitors', async () => {
    const monitor = createMonitorObject();

    const response = await client
      .post(prefix + '/monitors')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(monitor)
      .expect(200);

    expect(response.body.monitor.id)
      .to.not.empty()
      .and.type('string');
    expect(response.body.monitor).to.containDeep(toJSON(monitor));
  });

  it('get ' + prefix + '/monitors', async () => {
    const monitor = await givenMonitorData(wafapp);
    const response = await client
      .get(prefix + '/monitors')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);
    expect(toJSON(monitor)).to.containDeep(response.body.monitors[0]);
  });

  it('get ' + prefix + '/monitors/{id}', async () => {
    const monitor = await givenMonitorData(wafapp);

    const response = await client
      .get(prefix + `/monitors/${monitor.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);
    expect(response.body.monitor.id).equal(monitor.id);
  });

  it('patch ' + prefix + '/monitors/{id}', async () => {
    const monitor = await givenMonitorData(wafapp);

    const monitorObject = createMonitorObject({
      id: monitor.id,
      interval: 10,
      targetAddress: '192.0.1.23',
      targetPort: 22,
      monitorType: 'tcp',
      timeout: 16,
    });

    // return no content
    await client
      .patch(prefix + `/monitors/${monitor.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(monitorObject)
      .expect(204);

    await client
      .get(prefix + `/monitors/${monitor.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);
  });

  it('delete ' + prefix + '/monitors/{id}', async () => {
    const monitor = await givenMonitorData(wafapp);
    await client
      .del(prefix + `/monitors/${monitor.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(204);
    await client
      .get(prefix + `/monitors/${monitor.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(404);
  });
});
