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
  createRuleObject,
  givenRuleData,
  givenEndpointpolicyData,
} from '../helpers/database.helpers';
import {
  ShouldResponseWith,
  MockKeyStoneController,
  ExpectedData,
} from '../fixtures/controllers/mocks/mock.openstack.controller';
import uuid = require('uuid');

describe('RuleController', () => {
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

  it('post ' + prefix + '/rules: with id', async () => {
    const rule = createRuleObject({
      id: uuid(),
      endpointpolicyId: uuid(),
      tenantId: ExpectedData.tenantId,
    });

    const response = await client
      .post(prefix + '/rules')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(rule)
      .expect(200);
    expect(response.body.rule.id)
      .to.not.empty()
      .and.type('string');
  });

  it('post ' + prefix + '/rules: with no id', async () => {
    const rule = createRuleObject({endpointpolicyId: uuid()});

    const response = await client
      .post(prefix + '/rules')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(rule)
      .expect(200);
    expect(response.body.rule.id)
      .to.not.empty()
      .and.type('string');
    expect(response.body.rule).to.containDeep(toJSON(rule));
  });

  it('post ' + prefix + '/rules: no rule assocated', async () => {
    const rule = createRuleObject({endpointpolicyId: uuid()});

    const response = await client
      .post(prefix + '/rules')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(rule)
      .expect(200);

    expect(response.body.rule.id)
      .to.not.empty()
      .and.type('string');
    expect(response.body.rule).to.containDeep(toJSON(rule));
  });

  it('get ' + prefix + '/rules: of all', async () => {
    await givenRuleData(wafapp);
    await client
      .get(prefix + '/rules')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);
  });

  it('get ' + prefix + '/rules: with filter string', async () => {
    const rule = await givenRuleData(wafapp);

    await client
      .get(prefix + '/rules')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .query({filter: {where: {id: rule.id}}})
      .expect(200);
  });

  it('get ' + prefix + '/rules/count', async () => {
    let response = await client
      .get(prefix + '/rules/count')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);
    expect(response.body.count).to.eql(0);

    const rule = await givenRuleData(wafapp);

    response = await client
      .get(prefix + '/rules/count')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .query({where: {id: rule.id}})
      .expect(200);
    expect(response.body.count).to.eql(1);
  });

  it('get ' + prefix + '/rules/{id}: selected item', async () => {
    const rule = await givenRuleData(wafapp);
    const response = await client
      .get(prefix + '/rules/' + rule.id)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);
    expect(response.body.rule.id).equal(rule.id);
  });

  it('get ' + prefix + '/rules/{id}: not found', async () => {
    await client
      .get(prefix + '/rules/' + uuid())
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(404);
  });

  it('patch ' + prefix + '/rules/{id}: existing item', async () => {
    const patched_name = {name: 'new rule name', endpointpolicyId: uuid()};
    const rule = await givenRuleData(wafapp);

    await client
      .patch(prefix + '/rules/' + rule.id)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(patched_name)
      .expect(204, '');
  });

  it('patch ' + prefix + '/rules/{id}: non-existing item', async () => {
    const patched_name = {name: 'new rule name', endpointpolicyId: uuid()};
    await client
      .patch(prefix + '/rules/' + uuid())
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(patched_name)
      .expect(404);
  });

  it('delete ' + prefix + '/rules/{id}: non-existing item', async () => {
    await client
      .del(prefix + '/rules/' + uuid())
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(404);
  });

  it('delete ' + prefix + '/rules/{id}: existing item', async () => {
    const rule = await givenRuleData(wafapp);

    await client
      .del(prefix + '/rules/' + rule.id)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(204);
  });

  it(
    'delete ' + prefix + '/endpointpolicies/{endpointpolicyId}/rules/{ruleId}',
    async () => {
      const epp = await givenEndpointpolicyData(wafapp);
      const rule = await givenRuleData(wafapp, {
        id: uuid(),
        endpointpolicyId: epp.id,
      });

      await client
        .del(prefix + `/endpointpolicies/${epp.id}/rules/${rule.id}`)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(204);

      await client
        .get(prefix + `/endpointpolicies/${epp.id}/rules/${rule.id}`)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);
    },
  );

  it(
    'post ' + prefix + '/endpointpolicies/{endpointpolicyId}/rules',
    async () => {
      const epp = await givenEndpointpolicyData(wafapp);
      const rule = createRuleObject({id: uuid()});

      const response = await client
        .post(prefix + `/endpointpolicies/${epp.id}/rules`)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .send(rule)
        .expect(200);

      expect(response.body.rule.id)
        .to.not.empty()
        .and.type('string');
    },
  );

  it(
    'get ' + prefix + '/endpointpolicies/{endpointpolicyId}/rules',
    async () => {
      const epp = await givenEndpointpolicyData(wafapp);
      await givenRuleData(wafapp, {id: uuid(), endpointpolicyId: epp.id});
      await givenRuleData(wafapp, {id: uuid(), endpointpolicyId: epp.id});

      const response = await client
        .get(prefix + `/endpointpolicies/${epp.id}/rules`)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      expect(response.body.rules)
        .be.instanceOf(Array)
        .and.have.length(2);
    },
  );

  it(
    'get ' + prefix + '/endpointpolicies/{endpointpolicyId}/rules/{ruleId}',
    async () => {
      const epp = await givenEndpointpolicyData(wafapp);
      const rule = await givenRuleData(wafapp, {
        id: uuid(),
        endpointpolicyId: epp.id,
      });

      const response = await client
        .get(prefix + `/endpointpolicies/${epp.id}/rules/${rule.id}`)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      expect(response.body.rules[0].id)
        .to.not.empty()
        .and.type('string');
    },
  );

  it(
    'patch ' + prefix + '/endpointpolicies/{endpointpolicyId}/rules/{ruleId}',
    async () => {
      const epp = await givenEndpointpolicyData(wafapp);
      const rule = await givenRuleData(wafapp, {
        id: uuid(),
        endpointpolicyId: epp.id,
      });
      const patched_name = {id: rule.id, name: 'test'};

      const response = await client
        .patch(prefix + `/endpointpolicies/${epp.id}/rules/${rule.id}`)
        .send(patched_name)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      expect(response.body.count).to.eql(1);
    },
  );
});
