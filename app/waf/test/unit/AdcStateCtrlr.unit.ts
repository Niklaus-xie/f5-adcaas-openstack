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
  setupEnvs,
  teardownDepApps,
  setupDepApps,
} from '../helpers/testsetup-helper';
import {
  BigipBuiltInProperties,
  AuthedToken,
  ASGManager,
  ASGService,
  ASGServiceProvider,
} from '../../src/services';
import {setDefaultInterval} from '../../src/utils';
import {createAdcObject} from '../helpers/database.helpers';
import {expect, sinon} from '@loopback/testlab';
import {AdcStateCtrlr, AddonReqValues} from '../../src/controllers';
import {Adc} from '../../src/models';
import {
  stubLogger,
  restoreLogger,
  stubConsoleLog,
  restoreConsoleLog,
} from '../helpers/logging.helpers';
import {
  RestApplicationPort,
  StubResponses,
  LetResponseWith,
  ExpectedData,
} from '../fixtures/datasources/testrest.datasource';

type CheckEntry = {
  src: string;
  dst: string;
  exp: boolean;
};

describe('test AdcStateCtrlr', () => {
  let addonReq: AddonReqValues;
  let svc: ASGService;
  let asgMgr: ASGManager;
  let as3InfoStub: sinon.SinonStub;
  let partitionStub: sinon.SinonStub;

  before(async () => {
    await setupDepApps();

    BigipBuiltInProperties.port = RestApplicationPort.SSLCustom;
    setDefaultInterval(1);
    setupEnvs();

    addonReq = {
      userToken: AuthedToken.buildWith({
        body: [StubResponses.v2AuthToken200()],
      }),
    };
    stubLogger();
    stubConsoleLog();

    svc = await new ASGServiceProvider().value();
    asgMgr = new ASGManager(svc, addonReq.reqId);
  });
  beforeEach(() => {
    LetResponseWith();

    as3InfoStub = sinon.stub(asgMgr, 'getAS3Info');
    as3InfoStub.returns({
      version: 'faked',
    });
    partitionStub = sinon.stub(asgMgr, 'getPartition');
    partitionStub.returns({
      name: 'F5_' + ExpectedData.tenantId,
    });
  });
  afterEach(() => {
    as3InfoStub.restore();
    partitionStub.restore();
  });
  after(async () => {
    restoreConsoleLog();
    restoreLogger();
    await teardownDepApps();
  });

  let buildCheck = function(s: string): CheckEntry {
    let els = s.split(' ');
    return {
      src: els[0],
      dst: els[2],
      exp: els[3] === '✓',
    };
  };

  let myit = function(title: string, adcObj: object, condition?: Function) {
    it(title, async () => {
      if (condition) await condition!();
      let check = buildCheck(title);
      let adc = <Adc>(
        createAdcObject(Object.assign(adcObj, {status: check.src}))
      );

      let adcStCtr = new AdcStateCtrlr(adc, addonReq, asgMgr);

      if (title.includes('->'))
        expect(await adcStCtr.readyTo(check.dst)).eql(check.exp);
      else if (title.includes('+>'))
        expect(await adcStCtr.gotTo(check.dst)).eql(check.exp);
    });
  };

  //let statuses = Object.keys(AdcState);

  myit('NEW -> POWERON ✓', {});
  myit('POWERON -> DOINSTALLED ✓', {
    management: {
      connection: {
        ipAddress: ExpectedData.networks.management.ipAddr,
        tcpPort: ExpectedData.bigipMgmt.tcpPort,
      },
    },
  });

  myit('DOINSTALLED -> LICENSED ✓', {
    management: {
      connection: {
        ipAddress: ExpectedData.networks.management.ipAddr,
        tcpPort: ExpectedData.bigipMgmt.tcpPort,
      },
    },
  });
  myit('LICENSED -> ONBOARDED ✓', {
    management: {
      connection: {
        ipAddress: ExpectedData.networks.management.ipAddr,
        tcpPort: ExpectedData.bigipMgmt.tcpPort,
      },
    },
  });

  myit(
    'ONBOARDED -> TRUSTED ✓',
    {
      id: ExpectedData.adcId,
      management: {
        connection: {
          ipAddress: ExpectedData.networks.management.ipAddr,
          tcpPort: ExpectedData.bigipMgmt.tcpPort,
        },
      },
    },
    () => {
      ExpectedData.bigipMgmt.hostname = ExpectedData.adcId + '.openstack.local';
    },
  );

  myit('TRUSTED -> INSTALLED ✓', {
    management: {
      connection: {
        ipAddress: ExpectedData.networks.management.ipAddr,
        tcpPort: ExpectedData.bigipMgmt.tcpPort,
      },
      trustedDeviceId: ExpectedData.trustDeviceId,
    },
  });

  myit('INSTALLED -> PARTITIONED ✓', {
    management: {
      connection: {
        ipAddress: ExpectedData.networks.management.ipAddr,
        tcpPort: ExpectedData.bigipMgmt.tcpPort,
      },
      trustedDeviceId: ExpectedData.trustDeviceId,
    },
  });

  myit('PARTITIONED -> ACTIVE ✓', {
    tenantId: ExpectedData.tenantId,
    management: {
      connection: {
        ipAddress: ExpectedData.networks.management.ipAddr,
        tcpPort: ExpectedData.bigipMgmt.tcpPort,
      },
    },
  });

  myit('ACTIVE -> RECLAIMED ✓', {
    management: {},
  });
  myit('RECLAIMED -> POWERON ✓', {
    management: {
      connection: null,
      vmId: null,
      networks: null,
      trustedDeviceId: null,
    },
  });

  myit('ONBOARDERROR -> ONBOARDED ✓', {
    management: {
      connection: {
        ipAddress: ExpectedData.networks.management.ipAddr,
        tcpPort: ExpectedData.bigipMgmt.tcpPort,
      },
    },
  });

  myit('ONBOARDERROR -> RECLAIMED ✓', {
    management: {
      connection: {
        ipAddress: ExpectedData.networks.management.ipAddr,
        tcpPort: ExpectedData.bigipMgmt.tcpPort,
      },
    },
  });

  myit('RECLAIMED +> RECLAIMED ✓', {
    management: {
      connection: null,
      vmId: null,
      trustDeviceId: null,
      networks: null,
    },
  });

  myit('TRUSTED -> INSTALLED x : missing trustedDeviceId', {
    management: {
      connection: {
        ipAddress: ExpectedData.networks.management.ipAddr,
        tcpPort: ExpectedData.bigipMgmt.tcpPort,
      },
      trustedDeviceId: null,
    },
  });

  myit('PARTITIONED -> ACTIVE x : missing tenantId', {
    management: {
      connection: {
        ipAddress: ExpectedData.networks.management.ipAddr,
        tcpPort: ExpectedData.bigipMgmt.tcpPort,
      },
    },
  });

  myit('RECLAIMED -> POWERON x : existing connection.', {
    management: {
      connection: {
        ipAddress: ExpectedData.networks.management.ipAddr,
        tcpPort: ExpectedData.bigipMgmt.tcpPort,
      },
    },
  });

  myit('RECLAIMED -> POWERON x : existing vmId.', {
    management: {
      vmId: ExpectedData.vmId,
      connection: null,
      trustedDeviceId: null,
      networks: null,
    },
  });

  myit('RECLAIMED -> POWERON x : existing trust.', {
    management: {
      trustedDeviceId: ExpectedData.trustDeviceId,
      connection: null,
      vmId: null,
      networks: null,
    },
  });

  myit('RECLAIMED -> POWERON x : existing networks.', {
    management: {
      connection: null,
      trustedDeviceId: null,
      vmId: null,
      networks: {
        mgmt1: {
          fixedIp: ExpectedData.networks.management.ipAddr,
          macAddr: ExpectedData.networks.management.macAddr,
          portId: ExpectedData.networks.management.portId,
        },
      },
    },
  });

  myit('RECLAIMED -> POWERON x: exists connection', {
    management: {
      connection: {},
      vmId: null,
      trustedDeviceId: null,
      networks: null,
    },
  });

  myit('INSTALLED -> PARTITIONED x: missing trustedDeviceId', {
    management: {
      connection: {
        ipAddress: ExpectedData.networks.management.ipAddr,
        tcpPort: ExpectedData.bigipMgmt.tcpPort,
      },
      //trustedDeviceId: ExpectedData.trustDeviceId,
    },
  });

  myit('INSTALLED -> PARTITIONED x: missing connection', {
    management: {
      connection: null,
    },
  });

  myit('INSTALLERROR -> PARTITIONED x: cannot goon', {
    management: {},
  });

  myit('NEW -> ONBOARDED x : poweron fist.', {});

  myit('RECLAIMED +> RECLAIMED x : existing vmId', {
    management: {
      vmId: ExpectedData.vmId,
    },
  });

  myit(
    'INSTALLED +> INSTALLED x: exception when get as3info',
    {
      management: {
        connection: {
          ipAddress: ExpectedData.networks.management.ipAddr,
          tcpPort: ExpectedData.bigipMgmt.tcpPort,
        },
        trustedDeviceId: ExpectedData.trustDeviceId,
      },
    },
    () => {
      as3InfoStub.throws('I am tired.');
    },
  );
});
