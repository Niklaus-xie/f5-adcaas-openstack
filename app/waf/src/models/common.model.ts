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

import {Entity, property} from '@loopback/repository';
import {MetadataInspector} from '@loopback/metadata';
import {MODEL_PROPERTIES_KEY, PropertyDefinition} from '@loopback/repository';
import {AS3Declaration, as3Name} from '.';

export abstract class CommonEntity extends Entity {
  [key: string]: undefined | string | number | boolean | object;

  @property({
    type: 'string',
    id: true,
    required: true,
    schema: {
      response: true,
      example: '11111111-2222-3333-4444-555555555555',
    },
    as3: {
      property: 'label',
    },
  })
  id: string;

  @property({
    type: 'string',
    required: false,
    schema: {
      create: true,
      update: true,
      response: true,
      example: 'My name',
    },
  })
  name?: string;

  @property({
    type: 'string',
    required: false,
    schema: {
      create: true,
      update: true,
      response: true,
      example: 'My description',
    },
  })
  description?: string;

  @property({
    type: 'string',
    required: false,
    //TODO: Need to remove this default value, after we can get it from keystone.
    default: 'default',
    schema: {
      response: true,
    },
  })
  tenantId: string;

  @property({
    type: 'date',
    required: false,
    schema: {
      response: true,
      example: '2019-03-05T08:40:25.000Z',
    },
  })
  createdAt?: string;

  @property({
    type: 'date',
    required: false,
    schema: {
      response: true,
      example: '2019-03-05T08:40:25.100Z',
    },
  })
  updatedAt?: string;

  as3Class: string;

  constructor(data?: Partial<CommonEntity>) {
    super(data);
  }

  getAS3Class(): string {
    return this.as3Class;
  }

  getAS3Name(): string {
    return as3Name(this.id);
  }

  getAS3Pointer(): object {
    return {
      use: this.getAS3Name(),
    };
  }

  getAS3Declaration(): AS3Declaration {
    let obj: AS3Declaration = {
      class: this.getAS3Class(),
    };

    //TODO: Need to optimize it.
    let metadata =
      MetadataInspector.getAllPropertyMetadata<PropertyDefinition>(
        MODEL_PROPERTIES_KEY,
        this.constructor.prototype,
      ) || {};

    for (let key in metadata) {
      let as3 = metadata[key].as3;

      if (as3 && this[key]) {
        let propName = as3.property || key;
        switch (as3.type) {
          case 'name': {
            obj[propName] = as3Name(this[key] as string);
            break;
          }
          case 'use': {
            obj[propName] = {
              use: as3Name(this[key] as string),
            };
            break;
          }
          case 'bigip': {
            obj[propName] = {
              bigip: this[key],
            };
            break;
          }
          default: {
            obj[propName] = this[key];
            break;
          }
        }
      }
    }

    return obj;
  }
}
