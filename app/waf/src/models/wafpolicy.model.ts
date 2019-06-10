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

import {CommonEntity} from '.';
import {model, property} from '@loopback/repository';

@model()
export class Wafpolicy extends CommonEntity {
  @property({
    type: 'string',
    required: false,
    schema: {
      response: true,
      example: '/Common/my_waf',
    },
    as3: {},
  })
  file?: string;

  @property({
    type: 'boolean',
    required: false,
    default: false,
  })
  ignoreChanges: boolean;

  @property({
    type: 'string',
    required: true,
    schema: {
      create: true,
      update: true,
      response: true,
      required: true,
      example: 'https://raw.githubusercontent.com/wafrepo/master/my_waf.xml',
    },
    as3: {},
  })
  url: string;

  @property({
    type: 'boolean',
    schema: {
      create: true,
      update: true,
      response: true,
    },
    required: false,
    default: false,
  })
  public: boolean;

  constructor(data?: Partial<Wafpolicy>) {
    super(data);
    this.as3Class = 'WAF_Policy';
  }
}
