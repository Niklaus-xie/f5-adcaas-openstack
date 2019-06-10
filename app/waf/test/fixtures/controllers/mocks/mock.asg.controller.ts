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

import {post, requestBody} from '@loopback/rest';
import {StubResponses} from '../../datasources/testrest.datasource';
import {MockBaseController} from './mock.base.controller';

export class MockASGController extends MockBaseController {
  @post('/mgmt/shared/TrustedProxy')
  async trustedProxyPost(@requestBody() reqBody: object): Promise<object> {
    return ResponseWith['POST:/mgmt/shared/TrustedProxy']();
  }
}

let ResponseWith: {[key: string]: Function} = {};

//TODO combine it with the one in openstack.
export function ASGShouldResponseWith(spec: {[key: string]: Function}) {
  ResponseWith = {
    'POST:/mgmt/shared/TrustedProxy': StubResponses.trustProxyDeploy200,
  };
  Object.assign(ResponseWith, spec);
}
