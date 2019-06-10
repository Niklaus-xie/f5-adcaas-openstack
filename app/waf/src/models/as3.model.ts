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

import {Adc, Application, Declaration} from '.';

export enum patchOP {
  Add,
  Replace,
  Remove,
}

export class AS3Declaration {
  [key: string]: undefined | string | number | boolean | object;
}

export function as3Name(id: string) {
  return 'F5_' + id.replace(/-/g, '_');
}

export class AS3PatchOp {
  op: string = 'add';
  path: string;
  value: object;
  constructor(
    appliaction: Application,
    operation: patchOP,
    declararion?: Declaration,
  ) {
    this.path =
      '/' + as3Name(appliaction.tenantId) + '/' + appliaction.getAS3Name();
    switch (operation) {
      /* The patch-replace option could also take use of patch-add */
      case patchOP.Add:
      case patchOP.Replace:
        this.op = 'add';
        if (declararion) {
          this.value = declararion.content;
        }
        break;
      case patchOP.Remove:
        this.op = 'remove';
        break;
    }
  }
}

export class AS3PatchReqeust {
  readonly class: string = 'AS3';
  readonly action: string = 'patch';
  targetHost: string;
  targetPort: number;
  targetUsername: string;
  targetPassphrase: string;
  patchBody: AS3PatchOp[];

  constructor(
    adc: Adc,
    application: Application,
    operation: patchOP,
    declaration?: Declaration,
  ) {
    if (adc.management) {
      this.targetHost = adc.management.ipAddress;
      this.targetPort = adc.management.tcpPort;
    }
    //TODO: remove admin/pass after implement trusted connection
    this.targetUsername = 'admin';
    this.targetPassphrase = 'admin';
    this.patchBody = new Array<AS3PatchOp>();
    this.patchBody.push(new AS3PatchOp(application, operation, declaration));
  }
}

export class AS3DeployRequest {
  readonly class: string = 'AS3';
  readonly action: 'deploy';
  targetHost: string;
  targetPort: number;
  targetUsername: string;
  targetPassphrase: string;
  declaration: AS3Declaration;

  constructor(adc: Adc, application: Application, declaration?: Declaration) {
    this.targetHost = adc.management!.ipAddress;
    this.targetPort = adc.management!.tcpPort;
    //TODO: remove admin/pass after implement trusted connection
    this.targetUsername = 'admin';
    this.targetPassphrase = 'admin';
    this.declaration = {
      class: 'ADC',
      schemaVersion: '3.0.0',
      id: adc.id,
    };

    let tenant = as3Name(application.tenantId);
    this.declaration[tenant] = {
      class: 'Tenant',
      label: application.tenantId,
    };

    if (declaration) {
      Object.assign(this.declaration[tenant], {
        [application.getAS3Name()]: declaration.content,
      });
    }
  }
}
