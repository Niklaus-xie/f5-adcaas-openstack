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

import {Client, expect} from '@loopback/testlab';
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
  givenMemberData,
  givenPoolData,
  createMemberObject,
} from '../helpers/database.helpers';
import uuid = require('uuid');
import {
  ShouldResponseWith,
  MockKeyStoneController,
  ExpectedData,
} from '../fixtures/controllers/mocks/mock.openstack.controller';

describe('MemberController', () => {
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

  it('post ' + prefix + '/pools/{pool_id}/members', async () => {
    const pool = await givenPoolData(wafapp);
    const member = createMemberObject({id: uuid()});

    const response = await client
      .post(prefix + `/pools/${pool.id}/members`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(member)
      .expect(200);

    expect(response.body.member.id)
      .to.not.empty()
      .and.type('string');
  });

  it('get ' + prefix + '/pools/{pool_id}/members/{member_id}', async () => {
    const pool = await givenPoolData(wafapp);
    const member = await givenMemberData(wafapp, {id: uuid(), poolId: pool.id});

    const response = await client
      .get(prefix + `/pools/${pool.id}/members/${member.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);

    expect(response.body.members[0].id)
      .to.not.empty()
      .and.type('string');
  });

  it('get ' + prefix + '/pools/{pool_id}/members', async () => {
    const pool = await givenPoolData(wafapp);
    await givenMemberData(wafapp, {id: uuid(), poolId: pool.id});
    await givenMemberData(wafapp, {id: uuid(), poolId: pool.id});

    const response = await client
      .get(prefix + `/pools/${pool.id}/members`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);
    expect(response.body.members)
      .be.instanceOf(Array)
      .and.have.length(2);
  });

  it('delete ' + prefix + '/pools/{pool_id}/members/{member_id}', async () => {
    const pool = await givenPoolData(wafapp);
    const member = await givenMemberData(wafapp, {id: uuid(), poolId: pool.id});

    await client
      .del(prefix + `/pools/${pool.id}/members/${member.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(204);

    await client
      .get(prefix + `/pools/${pool.id}/members/${member.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);
  });

  it('patch ' + prefix + '/pools/{pool_id}/members/{member_id}', async () => {
    const pool = await givenPoolData(wafapp);
    const memberInDb = await givenMemberData(wafapp, {
      id: uuid(),
      poolId: pool.id,
    });
    const member = createMemberObject({
      id: memberInDb.id,
      port: 4789,
    });

    await client
      .patch(prefix + `/pools/${pool.id}/members/${member.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(member)
      .expect(204);
  });
});
