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
import {CommonEntity, AS3Declaration, Condition, Action} from '.';

@model()
export class Rule extends CommonEntity {
  @property({
    type: 'string',
    required: true,
    schema: {
      response: true,
      example: '2d3h896a-4d82-40ee-8d08-55550db1234',
    },
  })
  endpointpolicyId: string;

  @hasMany(() => Condition, {keyTo: 'ruleId'})
  conditions: Condition[] = [];

  @hasMany(() => Action, {keyTo: 'ruleId'})
  actions: Action[] = [];

  constructor(data?: Partial<Rule>) {
    super(data);
  }

  getAS3Declaration(): AS3Declaration {
    let obj: AS3Declaration = {
      name: this.name,
    };

    obj.conditions = this.conditions.map(condition =>
      condition.getAS3Declaration(),
    );

    obj.actions = this.actions.map(action => action.getAS3Declaration());

    return obj;
  }
}
