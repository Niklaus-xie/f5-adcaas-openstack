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

import {getService} from '@loopback/service-proxy';
import {inject, Provider} from '@loopback/core';
import {AS3DataSource} from '../datasources';

export interface AS3Service {
  // this is where you define the Node.js methods that will be
  // mapped to the SOAP operations as stated in the datasource
  // json file.
  info(host: string, port: number): Promise<string>;
  deploy(host: string, port: number, body: Object): Promise<string>;
}

export class AS3ServiceProvider implements Provider<AS3Service> {
  constructor(
    // AS3 must match the name property in the datasource json file
    @inject('datasources.AS3')
    protected dataSource: AS3DataSource = new AS3DataSource(),
  ) {}

  value(): Promise<AS3Service> {
    return getService(this.dataSource);
  }
}
