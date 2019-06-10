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

import {model, property, hasMany} from '@loopback/repository';
import {CommonEntity, AS3Declaration, Member, Monitor} from '.';

@model()
export class Pool extends CommonEntity {
  @property({
    type: 'string',
    required: false,
    default: 'round-robin',
    schema: {
      create: true,
      update: true,
      response: true,
      example: 'round-robin',
    },
    as3: {},
  })
  loadBalancingMode: string;

  @hasMany(() => Member, {keyTo: 'poolId'})
  members: Member[] = [];

  @property({
    type: 'number',
    required: false,
    default: 1,
    schema: {
      create: true,
      update: true,
      response: true,
      example: 1,
    },
  })
  minimumMembersActive: number;

  @property({
    type: 'number',
    required: false,
    default: 1,
    schema: {
      create: true,
      update: true,
      response: true,
      example: 1,
    },
  })
  minimumMonitors: number;

  @property({
    type: 'number',
    required: false,
    default: 0,
    schema: {
      create: true,
      update: true,
      response: true,
      example: 0,
    },
  })
  reselectTries: number;

  @property({
    type: 'string',
    required: false,
    default: 'none',
    schema: {
      create: true,
      update: true,
      response: true,
      example: 'drop',
    },
  })
  serviceDownAction: string;

  @property({
    type: 'number',
    required: false,
    default: 10,
    schema: {
      create: true,
      update: true,
      response: true,
      example: 10,
    },
  })
  slowRampTime: number;

  monitors: Monitor[] = [];

  constructor(data?: Partial<Pool>) {
    super(data);
    this.as3Class = 'Pool';
  }

  getAS3Declaration(): AS3Declaration {
    let obj = super.getAS3Declaration();

    obj.members = this.members.map(member => member.getAS3Declaration());

    obj.monitors = this.monitors.map(monitor => monitor.getAS3Pointer());

    return obj;
  }
}
