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
  givenServiceData,
} from '../helpers/database.helpers';
import {
  ShouldResponseWith,
  MockKeyStoneController,
  ExpectedData,
} from '../fixtures/controllers/mocks/mock.openstack.controller';
import uuid = require('uuid');

describe('ServiceController', () => {
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

  it('get' + prefix + '/services', async () => {
    const service = await givenServiceData(wafapp, uuid(), {id: uuid()});

    let response = await client
      .get(prefix + '/services')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);
    expect(toJSON(service)).to.containDeep(response.body.services[0]);
  });

  it('get' + prefix + '/services/{id}', async () => {
    const service = await givenServiceData(wafapp, uuid(), {id: uuid()});

    let response = await client
      .get(prefix + `/services/${service.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(200);

    expect(toJSON(service)).to.containDeep(response.body.service);
  });

  it('post ' + prefix + '/services', async () => {
    const request = {
      type: 'HTTPS',
      virtualAddresses: ['10.0.1.11', '10.0.2.11'],
      virtualPort: 443,
      applicationId: uuid(),
      defaultPoolId: uuid(),
    };

    const response = await client
      .post(prefix + '/services')
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .send(request)
      .expect(200);

    expect(response.body.service.id)
      .to.not.empty()
      .and.type('string');
    expect(response.body.service).to.containDeep(request);
  });

  it('delete' + prefix + '/services/{id}', async () => {
    const service = await givenServiceData(wafapp, uuid(), {id: uuid()});

    await client
      .del(prefix + `/services/${service.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(204);

    await client
      .get(prefix + `/services/${service.id}`)
      .set('X-Auth-Token', ExpectedData.userToken)
      .set('tenant-id', ExpectedData.tenantId)
      .expect(404);
  });
});
