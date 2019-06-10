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
  givenPoolData,
  givenMonitorData,
  givePoolMonitorAssociationData,
} from '../helpers/database.helpers';
import {
  ShouldResponseWith,
  MockKeyStoneController,
  ExpectedData,
} from '../fixtures/controllers/mocks/mock.openstack.controller';
import uuid = require('uuid');

describe('PoolMonitorAssociationController', () => {
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

  it('post ' + prefix + '/pools/{poolId}/monitors/{monitorId}', async () => {
    let pool = await givenPoolData(wafapp);
    let monitor = await givenMonitorData(wafapp);
    await client
      .post(prefix + '/pools/' + pool.id + '/monitors/' + monitor.id)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send()
      .expect(204);
  });

  it(
    'post ' +
      prefix +
      '/pools/{poolId}/monitors/{monitorId}: non-existing Pool',
    async () => {
      await client
        .post(prefix + '/pools/non-existing/monitors/any')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .send()
        .expect(404);
    },
  );

  it(
    'post ' +
      prefix +
      '/pools/{poolId}/monitors/{monitorId}: non-existing Monitor',
    async () => {
      let pool = await givenPoolData(wafapp);
      await client
        .post(prefix + '/pools/' + pool.id + '/monitors/non-existing')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .send()
        .expect(404);
    },
  );

  it(
    'get ' +
      prefix +
      '/pools/{id}/monitors: find monitors associated with a Pool',
    async () => {
      let pool = await givenPoolData(wafapp);
      let monitor = await givenMonitorData(wafapp);
      await givePoolMonitorAssociationData(wafapp, {
        poolId: pool.id,
        monitorId: monitor.id,
      });

      let response = await client
        .get(prefix + '/pools/' + pool.id + '/monitors')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);
      expect(toJSON(monitor)).to.containDeep(response.body.monitors[0]);
    },
  );

  it(
    'get ' +
      prefix +
      '/pools/{poolId}/monitors/{monitorId}: find Monitor associated with a Pool',
    async () => {
      let pool = await givenPoolData(wafapp);
      let monitor = await givenMonitorData(wafapp);
      await givePoolMonitorAssociationData(wafapp, {
        poolId: pool.id,
        monitorId: monitor.id,
      });

      let response = await client
        .get(prefix + '/pools/' + pool.id + '/monitors/' + monitor.id)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      expect(toJSON(monitor)).to.containDeep(response.body.monitor);
    },
  );

  it(
    'get ' + prefix + '/pools/{id}/monitors: no Monitor associated with a Pool',
    async () => {
      let pool = await givenPoolData(wafapp);
      await client
        .get(prefix + '/pools/' + pool.id + '/monitors')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);
    },
  );

  it(
    'get ' +
      prefix +
      '/pools/{poolId}/monitors/{monitorId}: no Monitor associated with a Pool',
    async () => {
      let pool = await givenPoolData(wafapp);
      let monitor = await givenMonitorData(wafapp);
      await client
        .get(prefix + '/pools/' + pool.id + '/monitors/' + monitor.id)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(404);
    },
  );

  it(
    'get ' +
      prefix +
      '/monitors/{monitorId}/pools: find Pools associated with a Monitor',
    async () => {
      let pool = await givenPoolData(wafapp);
      let monitor = await givenMonitorData(wafapp);
      await givePoolMonitorAssociationData(wafapp, {
        poolId: pool.id,
        monitorId: monitor.id,
      });

      let response = await client
        .get(prefix + '/monitors/' + monitor.id + '/pools')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);
      expect(toJSON(pool)).to.containDeep(response.body.pools[0]);
    },
  );

  it(
    'get ' +
      prefix +
      '/monitors/{monitorId}/pools/{poolId}: find Pool associated with a Monitor',
    async () => {
      let pool = await givenPoolData(wafapp);
      let monitor = await givenMonitorData(wafapp);
      await givePoolMonitorAssociationData(wafapp, {
        poolId: pool.id,
        monitorId: monitor.id,
      });

      let response = await client
        .get(prefix + '/monitors/' + monitor.id + '/pools/' + pool.id)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      expect(toJSON(pool)).to.containDeep(response.body.pool);
    },
  );

  it(
    'get ' +
      prefix +
      '/monitors/{monitorId}/pools: no Pool associated with a Monitor',
    async () => {
      let monitor = await givenMonitorData(wafapp);
      await client
        .get(prefix + '/monitors/' + monitor.id + '/pools')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);
    },
  );

  it(
    'get ' +
      prefix +
      '/monitors/{monitorId}/pools/{poolId}: no Pool associated with a Monitor',
    async () => {
      let pool = await givenPoolData(wafapp);
      let monitor = await givenMonitorData(wafapp);
      await client
        .get(prefix + '/monitors/' + monitor.id + '/pools/' + pool.id)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(404);
    },
  );

  it(
    'delete' +
      prefix +
      '/pools/{poolId}/monitors/{monitorId}: deassociate non-existing association',
    async () => {
      await client
        .del(prefix + '/pools/' + uuid() + '/monitors/' + uuid())
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(404);
    },
  );

  it(
    'delete ' +
      prefix +
      '/pools/{poolId}/monitors/{monitorId}: deassociate Monitor from a Pool',
    async () => {
      let pool = await givenPoolData(wafapp);
      let monitor = await givenMonitorData(wafapp);
      let assoc = await givePoolMonitorAssociationData(wafapp, {
        poolId: pool.id,
        monitorId: monitor.id,
      });

      await client
        .get(prefix + '/pools/' + assoc.poolId + '/monitors/' + assoc.monitorId)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      await client
        .del(prefix + '/pools/' + assoc.poolId + '/monitors/' + assoc.monitorId)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(204);

      await client
        .get(prefix + '/pools/' + assoc.poolId + '/monitors/' + assoc.monitorId)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(404);
    },
  );
});
