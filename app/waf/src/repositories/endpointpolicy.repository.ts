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
import {Endpointpolicy} from '../models';
import {DbDataSource} from '../datasources';
import {Rule} from '../models';
import {inject, Getter} from '@loopback/core';
import {RuleRepository} from './rule.repository';
import {CommonRepository} from './common';

export class EndpointpolicyRepository extends CommonRepository<
  Endpointpolicy,
  typeof Endpointpolicy.prototype.id
> {
  public readonly rules: HasManyRepositoryFactory<
    Rule,
    typeof Endpointpolicy.prototype.id
  >;
  constructor(
    @inject('datasources.db')
    dataSource: DbDataSource,
    @repository.getter('RuleRepository')
    getRuleRepository: Getter<RuleRepository>,
  ) {
    super(Endpointpolicy, dataSource);
    this.rules = this.createHasManyRepositoryFactoryFor(
      'rules',
      getRuleRepository,
    );
  }
}
