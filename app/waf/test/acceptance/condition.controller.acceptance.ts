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
  givenConditionData,
  givenRuleData,
  createConditionObject,
} from '../helpers/database.helpers';

import {
  ShouldResponseWith,
  MockKeyStoneController,
  ExpectedData,
} from '../fixtures/controllers/mocks/mock.openstack.controller';
import uuid = require('uuid');

describe('ConditionController', () => {
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

  it('post ' + prefix + '/rules/{ruleId}/conditions', async () => {
    const rule = await givenRuleData(wafapp);
    const condition = createConditionObject({id: uuid()});

    const response = await client
      .post(prefix + `/rules/${rule.id}/conditions`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(condition)
      .expect(200);

    expect(response.body.condition.id)
      .to.not.empty()
      .and.type('string');
  });

  it('get ' + prefix + '/rules/{ruleId}/conditions/{conditionId}', async () => {
    const rule = await givenRuleData(wafapp);
    const condition = await givenConditionData(wafapp, {
      id: uuid(),
      ruleId: rule.id,
    });

    const response = await client
      .get(prefix + `/rules/${rule.id}/conditions/${condition.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);

    expect(response.body.conditions[0].id)
      .to.not.empty()
      .and.type('string');
  });

  it('get ' + prefix + '/rules/{ruleId}/conditions', async () => {
    const rule = await givenRuleData(wafapp);
    await givenConditionData(wafapp, {id: uuid(), ruleId: rule.id});
    await givenConditionData(wafapp, {id: uuid(), ruleId: rule.id});

    const response = await client
      .get(prefix + `/rules/${rule.id}/conditions`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);

    expect(response.body.conditions)
      .be.instanceOf(Array)
      .and.have.length(2);
  });

  it(
    'delete ' + prefix + '/rules/{ruleId}/conditions/{conditionId}',
    async () => {
      const rule = await givenRuleData(wafapp);
      const condition = await givenConditionData(wafapp, {
        id: uuid(),
        ruleId: rule.id,
      });
      await client
        .del(prefix + `/rules/${rule.id}/conditions/${condition.id}`)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(204);

      await client
        .get(prefix + `/rules/${rule.id}/conditions/${condition.id}`)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);
    },
  );

  it(
    'patch ' + prefix + '/rules/{ruleId}/conditions/{conditionId}',
    async () => {
      const rule = await givenRuleData(wafapp);
      const conditionInDb = await givenConditionData(wafapp, {
        id: uuid(),
        ruleId: rule.id,
      });

      const condition = createConditionObject({
        id: conditionInDb.id,
        type: 'request',
      });
      const response = await client
        .patch(prefix + `/rules/${rule.id}/conditions/${condition.id}`)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .send(condition)
        .expect(200);

      expect(response.body.count).to.eql(1);
    },
  );
});
