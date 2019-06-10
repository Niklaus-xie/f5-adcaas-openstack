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
import {CommonEntity, AS3Declaration, Monitor} from '.';

@model()
export class Member extends CommonEntity {
  @property({
    type: 'string',
    required: true,
    schema: {
      create: true,
      update: true,
      response: true,
      example: '192.168.1.12',
    },
  })
  address: string;

  @property({
    type: 'number',
    required: true,
    schema: {
      create: true,
      update: true,
      response: true,
      example: 80,
    },
  })
  port: number;

  @property({
    type: 'string',
    required: true,
    schema: {
      response: true,
      example: '2d3h896a-4d82-40ee-8d08-55550dbc191',
    },
  })
  poolId: string;

  monitors: Monitor[] = [];

  constructor(data?: Partial<Member>) {
    super(data);
    //No AS3 class name
  }

  getAS3Declaration(): AS3Declaration {
    let obj: AS3Declaration = {
      servicePort: this.port,
      serverAddresses: [this.address],
    };

    obj.monitors = this.monitors.map(monitor => monitor.getAS3Pointer());

    return obj;
  }
}
