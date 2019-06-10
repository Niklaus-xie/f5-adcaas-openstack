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

import {model, property, Entity} from '@loopback/repository';
import {CommonEntity} from '.';

@model()
export class Declaration extends CommonEntity {
  @property({
    type: 'string',
    required: true,
    schema: {
      response: true,
      example: '11111111-2222-3333-4444-555555555555',
    },
  })
  applicationId: string;

  @property({
    type: 'object',
    required: true,
    schema: {
      response: true,
      example: {},
    },
  })
  content: object;

  //TODO: implement something like lastError to record deploy result

  constructor(data?: Partial<Declaration>) {
    super(data);
  }
}

export class ASGDeployRequest extends Entity {
  @property({
    type: 'string',
    required: true,
    schema: {
      create: true,
      example: '11111111-2222-3333-4444-555555555555',
    },
  })
  adcId: string;

  constructor(data?: object) {
    super(data);
  }
}
