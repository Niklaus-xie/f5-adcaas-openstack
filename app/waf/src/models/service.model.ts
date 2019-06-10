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
import {CommonEntity, AS3Declaration, Pool, Endpointpolicy} from '.';

@model()
export class Service extends CommonEntity {
  @property({
    type: 'string',
    required: true,
    schema: {
      create: true,
      response: true,
      required: true,
      example: 'HTTP',
    },
  })
  type: string;

  @property({
    type: 'string',
    required: true,
    schema: {
      create: true,
      required: true,
      response: true,
      example: '11111111-2222-3333-4444-555555555555',
    },
  })
  applicationId: string;

  @property({
    type: 'boolean',
    required: false,
    default: true,
  })
  addressStatus: boolean;

  @property({
    type: 'string',
    required: false,
  })
  clientTLS?: string;

  @property({
    type: 'object',
    required: false,
  })
  clonePools?: object;

  @property({
    type: 'boolean',
    required: false,
    default: true,
  })
  enable: boolean;

  @property({
    type: 'string',
    required: false,
  })
  fallbackPersistenceMethod?: string;

  @property({
    type: 'string',
    required: false,
  })
  lastHop?: string;

  @property({
    type: 'string',
    required: false,
  })
  layer4?: string;

  @property({
    type: 'number',
    required: false,
    default: 0,
  })
  maxConnections: number;

  @property({
    type: 'object',
    required: false,
  })
  metadata: object;

  @property({
    type: 'string',
    required: false,
  })
  mirroring?: string;

  @property({
    type: 'array',
    itemType: 'string',
    required: false,
  })
  persistenceMethods?: string[];

  @property({
    type: 'string',
    required: false,
  })
  policyFirewallEnforced?: string;

  @property({
    type: 'string',
    required: false,
  })
  policyFirewallStaged?: string;

  @property({
    type: 'string',
    required: false,
  })
  policyIAM?: string;

  @property({
    type: 'string',
    required: false,
  })
  policyNAT?: string;

  @property({
    type: 'string',
    required: false,
    schema: {
      create: true,
      update: true,
      response: true,
      example: '11111111-2222-3333-4444-555555555555',
    },
    as3: {
      property: 'pool',
      type: 'name',
    },
  })
  defaultPoolId?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileAnalytics?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileClassification?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileDiameterEndpoint?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileDNS?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileDOS?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileEnforcement?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileFIX?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileFTP?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileHTTP?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileHTTPAcceleration?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileHTTPCompression?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileIPOther?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileMultiplex?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileL4?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileRADIUS?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileRewrite?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileSIP?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileSubscriberManagement?: string;

  @property({
    type: 'object',
    required: false,
  })
  profileTCP?: object;

  @property({
    type: 'string',
    required: false,
  })
  profileTrafficLog?: string;

  @property({
    type: 'string',
    required: false,
  })
  profileUDP?: string;

  @property({
    type: 'boolean',
    required: false,
    default: true,
  })
  redirect80?: boolean;

  @property({
    type: 'string',
    required: false,
  })
  serverTLS?: string;

  @property({
    type: 'string',
    required: false,
  })
  snat?: string;

  @property({
    type: 'boolean',
    required: false,
    default: false,
  })
  translateClientPort: boolean;

  @property({
    type: 'boolean',
    required: false,
    default: true,
  })
  translateServerAddress: boolean;

  @property({
    type: 'boolean',
    required: false,
    default: true,
  })
  translateServerPort: boolean;

  @property({
    type: 'array',
    itemType: 'string',
    required: true,
    schema: {
      create: true,
      update: true,
      required: true,
      response: true,
      example: ['10.100.0.1'],
    },
    as3: {},
  })
  virtualAddresses: string[];

  @property({
    type: 'number',
    required: false,
    default: 80,
    schema: {
      create: true,
      update: true,
      response: true,
      example: '80',
    },
    as3: {},
  })
  virtualPort: number;

  defaultPool?: Pool;

  policies: Endpointpolicy[] = [];

  //TODO: many-to-many relation to other objects
  // iRules
  // allowVlans
  // rejectVlans
  // securityLogProfiles

  constructor(data?: Partial<Service>) {
    super(data);
  }

  getAS3Class(): string {
    return 'Service_' + this.type;
  }

  getAS3Declaration(): AS3Declaration {
    let obj = super.getAS3Declaration();

    obj.policyEndpoint = this.policies.map(policy => policy.getAS3Name());

    return obj;
  }
}
