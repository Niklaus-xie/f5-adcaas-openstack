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
  givenEndpointpolicyData,
  givenServiceEndpointpolicyAssociationData,
} from '../helpers/database.helpers';
import {
  ShouldResponseWith,
  MockKeyStoneController,
  ExpectedData,
} from '../fixtures/controllers/mocks/mock.openstack.controller';
import uuid = require('uuid');

describe('EndpointpolicyAssociationController', () => {
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

  it(
    'post ' +
      prefix +
      '/services/{serviceId}/endpointpolicies/{endpointpolicyId}',
    async () => {
      let service = await givenServiceData(wafapp, uuid());
      let policy = await givenEndpointpolicyData(wafapp);
      await client
        .post(
          prefix + '/services/' + service.id + '/endpointpolicies/' + policy.id,
        )
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .send()
        .expect(204);
    },
  );

  it(
    'post ' +
      prefix +
      '/services/{serviceId}/endpointpolicies/{endpointpolicyId}: non-existing Service',
    async () => {
      await client
        .post(prefix + '/services/non-existing/endpointpolicies/any')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .send()
        .expect(404);
    },
  );

  it(
    'post ' +
      prefix +
      '/services/{serviceId}/endpointpolicies/{endpointpolicyId}: non-existing Endpointpolicy',
    async () => {
      let service = await givenServiceData(wafapp, uuid());
      await client
        .post(
          prefix + '/services/' + service.id + '/endpointpolicies/non-existing',
        )
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .send()
        .expect(404);
    },
  );

  it(
    'get ' +
      prefix +
      '/services/{id}/endpointpolicies: find Endpointpolicies associated with a Service',
    async () => {
      let service = await givenServiceData(wafapp, uuid());
      let policy = await givenEndpointpolicyData(wafapp);
      await givenServiceEndpointpolicyAssociationData(wafapp, {
        serviceId: service.id,
        endpointpolicyId: policy.id,
      });

      let response = await client
        .get(prefix + '/services/' + service.id + '/endpointpolicies')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      expect(response.body.endpointpolicies[0]).to.containDeep(toJSON(policy));
    },
  );

  it(
    'get ' +
      prefix +
      '/services/{serviceId}/endpointpolicies/{endpointpolicyId}: find Endpointpolicy associated with a Service',
    async () => {
      let service = await givenServiceData(wafapp, uuid());
      let policy = await givenEndpointpolicyData(wafapp);
      await givenServiceEndpointpolicyAssociationData(wafapp, {
        serviceId: service.id,
        endpointpolicyId: policy.id,
      });

      let response = await client
        .get(
          prefix + '/services/' + service.id + '/endpointpolicies/' + policy.id,
        )
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      expect(response.body.endpointpolicy).to.containDeep(toJSON(policy));
    },
  );

  it(
    'get ' +
      prefix +
      '/services/{id}/endpointpolicies: no Endpointpolicy associated with a Service',
    async () => {
      let service = await givenServiceData(wafapp, uuid());
      await client
        .get(prefix + '/services/' + service.id + '/endpointpolicies')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);
    },
  );

  it(
    'get ' +
      prefix +
      '/services/{serviceId}/endpointpolicies/{endpointpolicyId}: no Endpointpolicy associated with a Service',
    async () => {
      let service = await givenServiceData(wafapp, uuid());
      let policy = await givenEndpointpolicyData(wafapp);
      await client
        .get(
          prefix + '/services/' + service.id + '/endpointpolicies/' + policy.id,
        )
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(404);
    },
  );

  it(
    'get ' +
      prefix +
      '/endpointpolicies/{id}/services: find Services associated with an Endpointpolicy',
    async () => {
      let service = await givenServiceData(wafapp, uuid());
      let policy = await givenEndpointpolicyData(wafapp);
      await givenServiceEndpointpolicyAssociationData(wafapp, {
        serviceId: service.id,
        endpointpolicyId: policy.id,
      });

      let response = await client
        .get(prefix + '/endpointpolicies/' + policy.id + '/services')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      expect(toJSON(service)).to.containDeep(response.body.services[0]);
    },
  );

  it(
    'get ' +
      prefix +
      '/endpointpolicies/{endpointpolicyId}/services/{serviceId}: find Service associated with an Endpointpolicy',
    async () => {
      let service = await givenServiceData(wafapp, uuid());
      let policy = await givenEndpointpolicyData(wafapp);
      await givenServiceEndpointpolicyAssociationData(wafapp, {
        serviceId: service.id,
        endpointpolicyId: policy.id,
      });

      let response = await client
        .get(
          prefix + '/endpointpolicies/' + policy.id + '/services/' + service.id,
        )
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      expect(toJSON(service)).to.containDeep(response.body.service);
    },
  );

  it(
    'get ' +
      prefix +
      '/endpointpolicies/{id}/services: no Service associated with an Endpointpolicy',
    async () => {
      let policy = await givenEndpointpolicyData(wafapp);
      await client
        .get(prefix + '/endpointpolicies/' + policy.id + '/services')
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);
    },
  );

  it(
    'get ' +
      prefix +
      '/endpointpolicies/{endpointpolicyId}/services/{serviceId}: no Endpointpolicy associated with a Service',
    async () => {
      let service = await givenServiceData(wafapp, uuid());
      let policy = await givenEndpointpolicyData(wafapp);
      await client
        .get(
          prefix + '/endpointpolicies/' + policy.id + '/services/' + service.id,
        )
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(404);
    },
  );

  it(
    'delete' +
      prefix +
      '/services/{serviceId}/endpointpolicies/{endpointpolicyId}: deassociate non-existing association',
    async () => {
      await client
        .del(prefix + '/services/' + uuid() + '/endpointpolicies/' + uuid())
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(404);
    },
  );

  it(
    'delete ' +
      prefix +
      '/services/{serviceId}/endpointpolicies/{endpointpolicyId}: deassociate Endpointpolicy from a Service',
    async () => {
      let service = await givenServiceData(wafapp, uuid());
      let policy = await givenEndpointpolicyData(wafapp);
      let assoc = await givenServiceEndpointpolicyAssociationData(wafapp, {
        serviceId: service.id,
        endpointpolicyId: policy.id,
      });

      await client
        .get(
          prefix +
            '/services/' +
            assoc.serviceId +
            '/endpointpolicies/' +
            assoc.endpointpolicyId,
        )
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(200);

      await client
        .del(
          prefix +
            '/services/' +
            assoc.serviceId +
            '/endpointpolicies/' +
            assoc.endpointpolicyId,
        )
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(204);

      await client
        .get(
          prefix +
            '/services/' +
            assoc.serviceId +
            '/endpointpolicies/' +
            assoc.endpointpolicyId,
        )
        .set('X-Auth-Token', ExpectedData.userToken)
        .set('tenant-id', ExpectedData.tenantId)
        .expect(404);
    },
  );
});
