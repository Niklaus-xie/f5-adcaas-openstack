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

import {DbDataSource} from '../../src/datasources';
import {expect} from '@loopback/testlab';
import {testdb_config} from '../fixtures/datasources/testdb.datasource';

describe('datasource function', () => {
  let dbsrc: DbDataSource;

  it('test DbDatasource with config', async () => {
    dbsrc = new DbDataSource(testdb_config);
    expect(dbsrc.name).to.be.eql('db');
  });

  it('test DbDatasource with no config', async () => {
    // let it go, and wait for ENOTFOUND. However it takes a little more time(~ 300 ms)
    dbsrc = new DbDataSource();
    expect(dbsrc.name).to.be.eql('db');
  });
});
