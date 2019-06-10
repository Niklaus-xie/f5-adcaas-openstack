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

import {DefaultCrudRepository} from '@loopback/repository';
import {ServiceEndpointpolicyAssociation} from '../models';
import {DbDataSource} from '../datasources';
import {inject} from '@loopback/core';

export class ServiceEndpointpolicyAssociationRepository extends DefaultCrudRepository<
  ServiceEndpointpolicyAssociation,
  typeof ServiceEndpointpolicyAssociation.prototype.endpointpolicyId
> {
  constructor(@inject('datasources.db') dataSource: DbDataSource) {
    super(ServiceEndpointpolicyAssociation, dataSource);
  }
}
