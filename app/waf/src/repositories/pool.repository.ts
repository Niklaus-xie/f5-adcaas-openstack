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
import {Pool, Member} from '../models';
import {DbDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';
import {MemberRepository} from './member.repository';
import {CommonRepository} from './common';

export class PoolRepository extends CommonRepository<
  Pool,
  typeof Pool.prototype.id
> {
  public readonly members: HasManyRepositoryFactory<
    Member,
    typeof Pool.prototype.id
  >;
  constructor(
    @inject('datasources.db')
    dataSource: DbDataSource,
    @repository.getter('MemberRepository')
    getMemberRepository: Getter<MemberRepository>,
  ) {
    super(Pool, dataSource);
    this.members = this.createHasManyRepositoryFactoryFor(
      'members',
      getMemberRepository,
    );
  }
}
