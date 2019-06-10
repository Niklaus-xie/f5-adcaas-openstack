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

export type ActionsBody = CreateBody & DeleteBody & SetupBody;

type CreateBody = {
  create: null;
};

type DeleteBody = {
  delete: null;
};

type SetupBody = {
  setup: undefined;
};

export type ConfigTypes = {
  type: string;
  //platformType: 'OpenStack';
  networks: {
    [key: string]: {
      type: 'mgmt' | 'ext' | 'int' | 'ha';
      networkId: string;
      fixedIp?: string;
      macAddr?: string;
      //floatingIp?: string;
      portId?: string; // cannot be appointed.
      ready?: boolean; // cannot be appointed.
      //vips?: [string]; // cannot be appointed.
    };
  };
  compute: {
    imageRef: string;
    flavorRef: string;
    userData?: string;
    vmId?: string; // cannot be appointed.
  };
  //floatingNetworkId?: string;
  securityGroup?: [string];
  management: {
    // cannot be appointed.
    ipAddress: string; // mostly floatingIp.
    tcpPort: number;
    username: string;
    password: string;
    rootPass: string;
  };
  status: string; // cannot be appointed.
  lastErr: string; // cannot be appointed.
};

@model()
export class Adc extends CommonEntity {
  @property({
    type: 'string',
    required: true,
    default: 'VE',
    schema: {
      create: true,
      response: true,
      required: true,
      example: 'VE',
    },
  })
  type: string;

  @property({
    type: 'object',
    required: true,
    schema: {
      response: true,
      example: {
        management: {
          type: 'mgmt',
          networkId: '80ccb4f0-5a9f-11e9-9721-3b33816a88bd',
          fixedIp: '172.16.11.100',
        },
        failover1: {
          type: 'ha',
          networkId: 'b1d0a920-5aa0-11e9-9721-3b33816a88bd',
        },
        internal1: {
          type: 'int',
          networkId: 'ba6e2a80-5aa0-11e9-9721-3b33816a88bd',
        },
        external2: {
          type: 'ext',
          networkId: 'c25eca10-5aa0-11e9-9721-3b33816a88bd',
        },
      },
    },
  })
  networks: ConfigTypes['networks'];

  @property({
    type: 'object',
    required: true,
    schema: {
      create: true,
      required: true,
      response: true,
      example: {
        imageRef: 'd4c52d70-5aa0-11e9-9721-3b33816a88bd',
        flavorRef: 'ff29d6b0-5aa0-11e9-9721-3b33816a88bd',
        userData: '#!/bin/bash \necho userData is optional \n',
      },
    },
  })
  compute: ConfigTypes['compute'];

  @property({
    type: 'object',
    schema: {
      response: true,
    },
  })
  management?: ConfigTypes['management'];

  @property({
    type: 'string',
    required: false,
    schema: {
      response: true,
      example: '2c52df5f-a393-40d8-9013-475eb54f7bef',
    },
  })
  trustedDeviceId?: string;

  @property({
    type: 'string',
    required: true,
    default: 'NEW',
    schema: {
      response: true,
    },
  })
  status: ConfigTypes['status'];

  @property({
    type: 'string',
    required: false,
    default: '',
    schema: {
      response: true,
    },
  })
  lastErr: ConfigTypes['lastErr'];

  constructor(data?: Partial<Adc>) {
    super(data);
  }
}

export class ActionsResponse extends Entity {
  @property({
    type: 'string',
    required: true,
    schema: {
      response: true,
      example: '11111111-2222-3333-4444-555555555555',
    },
  })
  id: string;
}

export class ActionsRequest extends Entity {
  @property({
    type: 'string',
    required: true,
    schema: {
      create: true,
      example: 'null',
    },
  })
  action: ActionsBody;
}
