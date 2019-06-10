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

import {WafApplication} from './application';
import {ApplicationConfig} from '@loopback/core';
import {probe} from 'network-utils-tcp-ping';
import {checkAndWait} from './utils';

export {WafApplication};

const prefix = '/adcaas/v1';

export async function main(options: ApplicationConfig = {}) {
  const app = new WafApplication(options);
  await app.boot();

  let dbReady = async () => {
    return probe(
      +process.env.DATABASE_PORT! || 5432,
      process.env.DATABASE_HOST,
      1000,
    );
  };
  await checkAndWait(dbReady, 3).then(async () => {
    await app.migrateSchema();
  });

  await app.start();

  const url = app.restServer.url;
  console.log(`Server is running at ${url}`);
  console.log(`Try ${url}${prefix}/ping`);

  return app;
}
