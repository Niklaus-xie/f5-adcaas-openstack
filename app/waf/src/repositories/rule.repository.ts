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

import {HasManyRepositoryFactory, repository} from '@loopback/repository';
import {Rule, Condition, Action} from '../models';
import {DbDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {ConditionRepository} from './condition.repository';
import {ActionRepository} from './action.repository';
import {CommonRepository} from './common';
export class RuleRepository extends CommonRepository<
  Rule,
  typeof Rule.prototype.id
> {
  public readonly conditions: HasManyRepositoryFactory<
    Condition,
    typeof Rule.prototype.id
  >;
  public readonly actions: HasManyRepositoryFactory<
    Action,
    typeof Rule.prototype.id
  >;
  constructor(
    @inject('datasources.db')
    dataSource: DbDataSource,
    @repository.getter('ConditionRepository')
    getConditionRepository: Getter<ConditionRepository>,
    @repository.getter('ActionRepository')
    getActionRepository: Getter<ActionRepository>,
  ) {
    super(Rule, dataSource);
    this.conditions = this.createHasManyRepositoryFactoryFor(
      'conditions',
      getConditionRepository,
    );

    this.actions = this.createHasManyRepositoryFactoryFor(
      'actions',
      getActionRepository,
    );
  }
}
