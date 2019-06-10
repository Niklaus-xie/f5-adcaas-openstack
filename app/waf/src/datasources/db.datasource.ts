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

import {inject} from '@loopback/core';
import {juggler} from '@loopback/repository';
import * as config from './db.datasource.json';

export class DbDataSource extends juggler.DataSource {
  static dataSourceName = 'db';

  constructor(
    @inject('datasources.config.db', {optional: true})
    dsConfig: {
      name: string;
      connector: string;
      url?: string;
      host?: string;
      port?: number;
      user?: string;
      password?: string;
      database?: string;
    } = config,
  ) {
    // Use env variable values to overwrite dsConfig default values
    dsConfig.host = process.env.DATABASE_HOST || dsConfig.host;
    dsConfig.port = Number(process.env.DATABASE_PORT) || dsConfig.port;
    dsConfig.user = process.env.DATABASE_USER || dsConfig.user;
    dsConfig.password = process.env.DATABASE_PASSWORD || dsConfig.password;
    dsConfig.database = process.env.DATABASE_DB || dsConfig.database;
    dsConfig.url = `postgres://${dsConfig.user}:${dsConfig.password}@${dsConfig.host}:${dsConfig.port}/${dsConfig.database}`;

    super(dsConfig);
  }
}
