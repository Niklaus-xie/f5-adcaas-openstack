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

import {expect, sinon} from '@loopback/testlab';
import {WafApplication, main} from '../..';
import {testdb} from '../fixtures/datasources/testdb.datasource';
import {stubConsoleLog, restoreConsoleLog} from '../helpers/logging.helpers';

describe('WAFApplication main logic', () => {
  let app: WafApplication;

  before('stub WafApplication', async () => {
    process.env.DATABASE_HOST = '0.0.0.0';
    process.env.DATABASE_PORT = '5432';
    sinon.stub(WafApplication.prototype, 'migrateSchema');
    sinon.stub(WafApplication.prototype, 'boot');
    sinon.stub(WafApplication.prototype, 'start');
    sinon.stub(WafApplication.prototype, 'stop');
  });

  after('restore WafApplication', async () => {
    sinon.restore();
  });

  it('invoke main without configuration', async () => {
    stubConsoleLog();
    app = await main();
    expect(app.options).to.eql({});
    restoreConsoleLog();
  });

  it('invoke main with a port number', async () => {
    stubConsoleLog();
    app = await main({port: 9999});
    expect(app.options).to.containEql({port: 9999});
    restoreConsoleLog();
  });
});

describe('WAFApplication constructor', () => {
  let app: WafApplication;

  it('construct app without parameter', async () => {
    app = new WafApplication();
    app.dataSource(testdb);
    await app.start();
    await app.stop();
  });

  it('construct app with a parameter', async () => {
    app = new WafApplication({});
    app.dataSource(testdb);
    await app.start();
    await app.stop();
  });
});
