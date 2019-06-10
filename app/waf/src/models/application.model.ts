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

import {CommonEntity, Declaration, AS3Declaration, Service} from '.';
import {model, property, hasMany} from '@loopback/repository';

@model()
export class Application extends CommonEntity {
  @property({
    type: 'string',
    schema: {
      response: true,
      example: 'TBD',
    },
  })
  status?: string;

  @property({
    type: 'string',
    required: false,
    schema: {
      create: true,
      update: true,
      response: true,
      example: '11111111-2222-3333-4444-555555555555',
    },
  })
  adcId?: string;

  @property({
    type: 'string',
    required: false,
    schema: {
      update: true,
      response: true,
      example: '11111111-2222-3333-4444-555555555555',
    },
  })
  defaultDeclarationId?: string;

  @hasMany(() => Service, {keyTo: 'applicationId'})
  services: Service[] = [];

  @hasMany(() => Declaration, {keyTo: 'applicationId'})
  declarations?: Declaration[];

  constructor(data?: Partial<Application>) {
    super(data);
    this.as3Class = 'Application';
  }

  getAS3Declaration(): AS3Declaration {
    let obj = super.getAS3Declaration();

    obj.template = 'generic';

    this.services.forEach(service => {
      obj[service.getAS3Name()] = service.getAS3Declaration();

      if (service.defaultPool) {
        obj[
          service.defaultPool.getAS3Name()
        ] = service.defaultPool.getAS3Declaration();

        // Declare monitors of default Pool and its Members
        service.defaultPool.monitors.forEach(monitor => {
          obj[monitor.getAS3Name()] = monitor.getAS3Declaration();
        });

        service.defaultPool.members.forEach(member => {
          member.monitors.forEach(monitor => {
            obj[monitor.getAS3Name()] = monitor.getAS3Declaration();
          });
        });
      }

      service.policies.forEach(policy => {
        obj[policy.getAS3Name()] = policy.getAS3Declaration();

        policy.rules.forEach(rule => {
          rule.actions.forEach(action => {
            if (action.type === 'waf' && action.wafpolicy) {
              obj[
                action.wafpolicy.getAS3Name()
              ] = action.wafpolicy.getAS3Declaration();
            }

            //TODO: Get Pools from Endpointpolicy
          });
        });
      });
    });

    return obj;
  }
}
