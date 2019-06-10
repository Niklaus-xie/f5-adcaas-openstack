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

import {sinon} from '@loopback/testlab';
import {AbstractLogger} from 'typescript-logging';

let consoleLog: sinon.SinonStub;
let loggerFuncs: {[key: string]: sinon.SinonStub} = {};

export function stubConsoleLog(): void {
  consoleLog = sinon.stub(console, 'log');
  consoleLog.callsFake(() => {});
}

export function restoreConsoleLog(): void {
  consoleLog.restore();
}

export function stubLogger() {
  let fakeFunc = () => {};

  loggerFuncs['trace'] = sinon.stub(AbstractLogger.prototype, 'trace');
  loggerFuncs['debug'] = sinon.stub(AbstractLogger.prototype, 'debug');
  loggerFuncs['info'] = sinon.stub(AbstractLogger.prototype, 'info');
  loggerFuncs['warn'] = sinon.stub(AbstractLogger.prototype, 'warn');
  loggerFuncs['error'] = sinon.stub(AbstractLogger.prototype, 'error');
  loggerFuncs['fatal'] = sinon.stub(AbstractLogger.prototype, 'fatal');

  for (let f of Object.keys(loggerFuncs)) {
    loggerFuncs[f].callsFake(fakeFunc);
  }
}

export function restoreLogger() {
  for (let f of Object.keys(loggerFuncs)) {
    loggerFuncs[f].restore();
  }
}
