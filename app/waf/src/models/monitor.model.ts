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
import {CommonEntity} from './common.model';

@model()
export class Monitor extends CommonEntity {
  @property({
    type: 'number',
    default: 5,
    schema: {
      create: true,
      update: true,
      response: true,
      example: 5,
    },
  })
  interval: number;

  @property({
    type: 'number',
    default: 16,
    schema: {
      create: true,
      update: true,
      response: true,
      example: 16,
    },
  })
  timeout: number;

  @property({
    type: 'string',
    default: '',
    schema: {
      create: true,
      update: true,
      response: true,
      example: '192.168.10.123',
    },
  })
  targetAddress: string;

  @property({
    type: 'number',
    default: 0,
    schema: {
      create: true,
      update: true,
      response: true,
      example: 8080,
    },
  })
  targetPort: number;

  @property({
    type: 'string',
    required: true,
    default: 'tcp',
    schema: {
      create: true,
      update: true,
      response: true,
      example: 'tcp',
    },
    as3: {},
  })
  monitorType: string;

  // user can specify the below attributes to create a certain type monitor
  // TODO: separate the monitors to more specific monitor in future

  @property({
    type: 'string',
    default: 'no-error',
  })
  acceptRCODE: string;

  @property({
    type: 'boolean',
    default: false,
  })
  adaptive: boolean;

  @property({
    type: 'number',
    default: 500,
  })
  adaptiveDivergenceMilliseconds: number;

  @property({
    type: 'number',
    default: 100,
  })
  adaptiveDivergencePercentage: number;

  @property({
    type: 'string',
    default: 'relative',
  })
  adaptiveDivergenceType: string;

  @property({
    type: 'number',
    default: 1000,
  })
  adaptiveLimitMilliseconds: number;

  @property({
    type: 'number',
    default: 180,
  })
  adaptiveWindow: number;

  @property({
    type: 'string',
    default: 'query-type',
  })
  answerContains: string;

  @property({
    type: 'string',
    default: '',
  })
  arguments: string;

  @property({
    type: 'string',
  })
  base: string;

  @property({
    type: 'boolean',
    default: true,
  })
  chaseReferrals: boolean;

  @property({
    type: 'string',
    default: '',
  })
  ciphers: string;

  @property({
    type: 'string',
  })
  clientCertificate: string;

  @property({
    type: 'array',
    itemType: 'number',
  })
  codesDown: number[];

  @property({
    type: 'array',
    itemType: 'number',
  })
  codesUp: number[];

  @property({
    type: 'string',
    default: '',
  })
  domain: string;

  @property({
    type: 'number',
    default: 0,
  })
  dscp: number;

  @property({
    type: 'boolean',
    default: true,
  })
  expand: boolean;

  @property({
    type: 'string',
  })
  filter: string;

  @property({
    type: 'string',
    default: '',
  })
  headers: string;

  @property({
    type: 'string',
  })
  label: string;

  @property({
    type: 'boolean',
    default: false,
  })
  mandatoryAttributes: boolean;

  @property({
    type: 'string',
  })
  nasIpAddress: string;

  @property({
    type: 'object',
  })
  passphrase: object;

  @property({
    type: 'string',
  })
  pathname: string;

  @property({
    type: 'string',
    default: 'udp',
  })
  protocol: string;

  @property({
    type: 'string',
  })
  queryName: string;

  @property({
    type: 'string',
    default: 'a',
  })
  queryType: string;

  @property({
    type: 'string',
  })
  receive: string;

  @property({
    type: 'string',
    default: '',
  })
  receiveDown: string;

  @property({
    type: 'string',
  })
  remark: string;

  @property({
    type: 'string',
    default: '',
  })
  request: string;

  @property({
    type: 'boolean',
    default: false,
  })
  reverse: boolean;

  @property({
    type: 'object',
  })
  script: object;

  @property({
    type: 'object',
  })
  secret: object;

  @property({
    type: 'string',
    default: 'none',
  })
  security: string;

  @property({
    type: 'string',
  })
  send: string;

  @property({
    type: 'number',
    default: 0,
  })
  timeUntilUp: number;

  @property({
    type: 'boolean',
    default: false,
  })
  transparent: boolean;

  @property({
    type: 'number',
    default: 0,
  })
  upInterval: number;

  @property({
    type: 'string',
  })
  username: string;

  constructor(data?: Partial<Monitor>) {
    super(data);
    this.as3Class = 'Monitor';
  }
}
