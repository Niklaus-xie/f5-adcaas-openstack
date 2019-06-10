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

import {
  LoggerFactoryOptions,
  LFService,
  LogGroupRule,
  LogLevel,
} from 'typescript-logging';

const defaultLogLevel = LogLevel.fromString(process.env.LOGLEVEL || 'Trace');

let options = new LoggerFactoryOptions();

const array = ['api', 'controller', '.'];
array.forEach(element => {
  options = options.addLogGroupRule(
    new LogGroupRule(new RegExp(element + '+'), defaultLogLevel),
  );
});

// TODO: refactor the factory to bind to application context.
export const factory = LFService.createNamedLoggerFactory(
  'LoggerFactory',
  options,
);
