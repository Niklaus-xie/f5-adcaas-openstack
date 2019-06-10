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

import {MockBaseController} from './mock.base.controller';
import {post, param, get} from '@loopback/rest';
import {StubResponses} from '../../datasources/testrest.datasource';

export class MockDOController extends MockBaseController {
  @post('/mgmt/shared/declarative-onboarding')
  async sysInfo(): Promise<object> {
    return await ResponseWith['/mgmt/shared/declarative-onboarding']();
  }

  @get('/mgmt/shared/declarative-onboarding/task/{taskId}')
  async taskResult(
    @param.path.string('taskId') taskId: string,
  ): Promise<object> {
    return await ResponseWith[
      '/mgmt/shared/declarative-onboarding/task/{taskId}'
    ]();
  }
}

let ResponseWith: {[key: string]: Function} = {};

//TODO combine it with the one in openstack.
export function DOShouldResponseWith(spec: {[key: string]: Function}) {
  ResponseWith = {
    '/mgmt/shared/declarative-onboarding': StubResponses.onboardingSucceed202,
    '/mgmt/shared/declarative-onboarding/task/{taskId}':
      StubResponses.onboardingSucceed200,
  };
  Object.assign(ResponseWith, spec);
}
