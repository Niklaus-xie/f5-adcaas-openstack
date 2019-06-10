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

import {model, property} from '@loopback/repository';
import {CommonEntity, AS3Declaration} from '.';

@model()
export class Condition extends CommonEntity {
  @property({
    type: 'object',
    required: false,
    as3: {},
  })
  all: object;

  @property({
    type: 'object',
    required: false,
  })
  alpn: object;

  @property({
    type: 'string',
    required: false,
    schema: {
      create: true,
      response: true,
      example: 'request',
    },
  })
  event: string;

  @property({
    type: 'object',
    required: false,
  })
  extension: object;

  @property({
    type: 'object',
    required: false,
  })
  host: object;

  @property({
    type: 'number',
    required: false,
    schema: {
      create: true,
      update: true,
      response: true,
      example: 1,
    },
  })
  index: number;

  @property({
    type: 'boolean',
    required: false,
    default: false,
  })
  normalized: boolean;

  @property({
    type: 'object',
    required: false,
  })
  npn: object;

  @property({
    type: 'object',
    required: false,
  })
  path: object;

  @property({
    type: 'object',
    required: false,
  })
  pathSegment: object;

  @property({
    type: 'object',
    required: false,
  })
  port: object;

  @property({
    type: 'object',
    required: false,
  })
  queryParameter: object;

  @property({
    type: 'object',
    required: false,
  })
  queryString: object;

  @property({
    type: 'object',
    required: false,
  })
  scheme: object;

  @property({
    type: 'object',
    required: false,
  })
  serverName: object;

  @property({
    type: 'string',
    required: false,
    schema: {
      create: true,
      response: true,
      example: 'httpUri',
    },
    as3: {},
  })
  type: string;

  @property({
    type: 'object',
    required: false,
  })
  unnamedQueryParameter: object;

  @property({
    type: 'string',
    required: true,
    schema: {
      response: true,
      example: '2d3h896a-4d82-4234-8d08-55550dbc191',
    },
  })
  ruleId: string;

  constructor(data?: Partial<Condition>) {
    super(data);
  }

  getAS3Declaration(): AS3Declaration {
    let obj = super.getAS3Declaration();

    obj.name = obj.label;
    delete obj.label;
    return obj;
  }
}
