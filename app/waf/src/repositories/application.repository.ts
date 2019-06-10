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
import {CommonRepository} from '.';
import {Application, Declaration, Service} from '../models';
import {DeclarationRepository, ServiceRepository} from '.';
import {DbDataSource} from '../datasources';
import {inject, Getter} from '@loopback/core';

export class ApplicationRepository extends CommonRepository<
  Application,
  typeof Application.prototype.id
> {
  public readonly declarations: HasManyRepositoryFactory<
    Declaration,
    typeof Application.prototype.id
  >;

  public readonly services: HasManyRepositoryFactory<
    Service,
    typeof Application.prototype.id
  >;

  constructor(
    @inject('datasources.db')
    dataSource: DbDataSource,
    @repository.getter('DeclarationRepository')
    getDeclarationRepository: Getter<DeclarationRepository>,
    @repository.getter('ServiceRepository')
    getServiceRepository: Getter<ServiceRepository>,
  ) {
    super(Application, dataSource);

    this.declarations = this.createHasManyRepositoryFactoryFor(
      'declarations',
      getDeclarationRepository,
    );

    this.services = this.createHasManyRepositoryFactoryFor(
      'services',
      getServiceRepository,
    );
  }
}
