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

// Copyright F5 Networks, Inc. 2018. All Rights Reserved.
// Node module: @loopback/example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Client, expect, sinon, toJSON} from '@loopback/testlab';
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
  givenWafpolicyData,
  createWafpolicyObject,
  givenAdcData,
} from '../helpers/database.helpers';
import {
  ShouldResponseWith,
  MockKeyStoneController,
  ExpectedData,
} from '../fixtures/controllers/mocks/mock.openstack.controller';

import uuid = require('uuid');
import {WafpolicyController} from '../../src/controllers';

describe('WafpolicyController', () => {
  let wafapp: WafApplication;
  let client: Client;
  let mockKeystoneApp: TestingApplication;
  let controller: WafpolicyController;
  let uploadWafpolicyStub: sinon.SinonStub;
  let checkWafpolicyStub: sinon.SinonStub;

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

    controller = await wafapp.get<WafpolicyController>(
      'controllers.WafpolicyController',
    );

    ShouldResponseWith({});
    setupEnvs();
  });

  beforeEach('Empty database', async () => {
    await givenEmptyDatabase(wafapp);
    uploadWafpolicyStub = sinon.stub(
      controller.asgService,
      'uploadWafpolicyByUrl',
    );

    checkWafpolicyStub = sinon.stub(
      controller.asgService,
      'checkWafpolicyByName',
    );
  });

  afterEach(async () => {
    uploadWafpolicyStub.restore();
    checkWafpolicyStub.restore();
  });

  after(async () => {
    await teardownApplication(wafapp);
    teardownRestAppAndClient(mockKeystoneApp);
    teardownEnvs();
  });

  it('post ' + prefix + '/wafpolicies: with no id', async () => {
    const wafpolicy = createWafpolicyObject();

    const response = await client
      .post(prefix + '/wafpolicies')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(wafpolicy)
      .expect(200);

    expect(response.body.wafpolicy).to.containDeep(toJSON(wafpolicy));
  });

  it(
    'post ' +
      prefix +
      '/wafpolicies/${id}/adcs/${adcId}: uploading wafpolicy with a public wafpolicy',
    async () => {
      const wafpolicy = await givenWafpolicyData(wafapp, {
        tenantId: 'a random id',
        public: true,
      });

      const adc = await givenAdcData(wafapp, {
        trustedDeviceId: uuid(),
      });

      uploadWafpolicyStub.returns({
        id: uuid(),
        name: `${wafpolicy.id}`,
        enforcementMode: 'blocking',
        lastChanged: 'random',
        lastChange: 'random',
        state: 'UPLOADING',
        path: `/Common/${wafpolicy.id}`,
      });

      await client
        .post(prefix + `/wafpolicies/${wafpolicy.id}/adcs/${adc.id}`)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .send()
        .expect(204);
    },
  );

  it(
    'post ' +
      prefix +
      '/wafpolicies/${id}/adcs/${adcId}: uploading wafpolicy with a private wafpolicy',
    async () => {
      const wafpolicy = await givenWafpolicyData(wafapp, {
        public: false,
      });

      const adc = await givenAdcData(wafapp, {
        trustedDeviceId: uuid(),
      });

      uploadWafpolicyStub.returns({
        id: uuid(),
        name: `${wafpolicy.id}`,
        enforcementMode: 'blocking',
        lastChanged: 'random',
        lastChange: 'random',
        state: 'UPLOADING',
        path: `/Common/${wafpolicy.id}`,
      });

      await client
        .post(prefix + `/wafpolicies/${wafpolicy.id}/adcs/${adc.id}`)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .send()
        .expect(204);
    },
  );

  it(
    'post ' +
      prefix +
      '/wafpolicies/${id}/adcs/${adcId}: uploading wafpolicy with an untrunsted device',
    async () => {
      const wafpolicy = await givenWafpolicyData(wafapp, {
        public: false,
      });

      const adc = await givenAdcData(wafapp);

      uploadWafpolicyStub.returns({
        id: uuid(),
        name: `${wafpolicy.id}`,
        enforcementMode: 'blocking',
        lastChanged: 'random',
        lastChange: 'random',
        state: 'UPLOADING',
        path: `/Common/${wafpolicy.id}`,
      });

      await client
        .post(prefix + `/wafpolicies/${wafpolicy.id}/adcs/${adc.id}`)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .send()
        .expect(422);
    },
  );

  it(
    'get ' + prefix + '/wafpolicies/${id}/adcs/${adcId}: get wafpolicy status',
    async () => {
      const wafpolicy = await givenWafpolicyData(wafapp, {
        tenantId: 'a random id',
        public: true,
      });

      const adc = await givenAdcData(wafapp, {
        trustedDeviceId: uuid(),
      });

      checkWafpolicyStub.returns([
        {
          id: uuid(),
          name: `${wafpolicy.id}`,
          enforcementMode: 'blocking',
          lastChanged: 'random',
          lastChange: 'random',
          state: 'UPLOADING',
          path: `/Common/${wafpolicy.id}`,
        },
      ]);

      const resp = await client
        .get(prefix + `/wafpolicies/${wafpolicy.id}/adcs/${adc.id}`)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      expect(resp.body.wafpolicyondevice.state).equal('UPLOADING');
    },
  );

  it('get ' + prefix + '/wafpolicies: of all', async () => {
    const wafpolicy = await givenWafpolicyData(wafapp);

    let response = await client
      .get(prefix + '/wafpolicies')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(toJSON(wafpolicy)).to.containDeep(response.body.wafpolicies[0]);
  });

  it(
    'get ' + prefix + '/wafpolicies: of all with public flag two',
    async () => {
      await givenWafpolicyData(wafapp, {public: true, tenantId: 'a random id'});
      await givenWafpolicyData(wafapp, {
        public: true,
      });

      let response = await client
        .get(prefix + '/wafpolicies')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body.wafpolicies.length).to.eql(2);
    },
  );

  it(
    'get ' + prefix + '/wafpolicies: of all with public flag one',
    async () => {
      await givenWafpolicyData(wafapp, {
        public: false,
        tenantId: 'a random id',
      });
      await givenWafpolicyData(wafapp, {
        public: true,
      });

      let response = await client
        .get(prefix + '/wafpolicies')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body.wafpolicies.length).to.eql(1);
    },
  );

  it('get ' + prefix + '/wafpolicies: with filter string', async () => {
    const wafpolicy = await givenWafpolicyData(wafapp);

    let response = await client
      .get(prefix + '/wafpolicies')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .query({filter: {where: {id: wafpolicy.id}}})
      .expect(200);

    expect(toJSON(wafpolicy)).to.containDeep(response.body.wafpolicies[0]);
  });

  it('get ' + prefix + '/wafpolicies/count', async () => {
    let response = await client
      .get(prefix + '/wafpolicies/count')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);
    expect(response.body.count).to.eql(0);

    const wafpolicy = await givenWafpolicyData(wafapp);

    response = await client
      .get(prefix + '/wafpolicies/count')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .query({where: {id: wafpolicy.id}})
      .expect(200);
    expect(response.body.count).to.eql(1);
  });

  it('get ' + prefix + '/wafpolicies/{id}: selected item', async () => {
    await givenWafpolicyData(wafapp);
    const wafpolicy = await givenWafpolicyData(wafapp);

    let response = await client
      .get(prefix + '/wafpolicies/' + wafpolicy.id)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);

    expect(toJSON(wafpolicy)).to.containDeep(response.body.wafpolicy);
  });

  it('get ' + prefix + '/wafpolicies/{id}: not found', async () => {
    await client
      .get(prefix + '/wafpolicies/' + uuid())
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(404);
  });

  it(
    'get ' + prefix + '/wafpolicies/{id}: selected item with public flag',
    async () => {
      await givenWafpolicyData(wafapp);
      const wafpolicy = await givenWafpolicyData(wafapp, {
        tenantId: 'random tanant id',
        public: true,
      });

      let response = await client
        .get(prefix + '/wafpolicies/' + wafpolicy.id)
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      expect(toJSON(wafpolicy)).to.containDeep(response.body.wafpolicy);
    },
  );

  it('patch ' + prefix + '/wafpolicies/{id}: existing item', async () => {
    const patched_name = {name: 'new waf policy name'};
    const wafpolicy = await givenWafpolicyData(wafapp);

    await client
      .patch(prefix + '/wafpolicies/' + wafpolicy.id)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(patched_name)
      .expect(204, '');
  });

  it('patch ' + prefix + '/wafpolicies/{id}: non-existing item', async () => {
    const patched_name = {name: 'new waf policy name'};
    await client
      .patch(prefix + '/wafpolicies/' + uuid())
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(patched_name)
      .expect(404);
  });

  it('delete ' + prefix + '/wafpolicies/{id}: non-existing item', async () => {
    await client
      .del(prefix + '/wafpolicies/' + uuid())
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(404);
  });

  it('delete ' + prefix + '/wafpolicies/{id}: existing item', async () => {
    const wafpolicy = await givenWafpolicyData(wafapp);

    await client
      .del(prefix + '/wafpolicies/' + wafpolicy.id)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(204);
  });
});
