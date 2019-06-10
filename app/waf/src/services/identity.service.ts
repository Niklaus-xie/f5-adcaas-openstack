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
import {OpenstackDataSource} from '../datasources';
import {factory} from '../log4ts';
import {RestApplication} from '@loopback/rest';
import {WafBindingKeys} from '../keys';

export interface IdentityService {
  v2AuthToken(url: string, body: object): Promise<object>;
  v2ValidateToken(url: string, adminToken: string): Promise<object>;
  v3AuthToken(url: string, body: object): Promise<object>;
  v3ValidateToken(
    url: string,
    adminToken: string,
    userToken: string,
  ): Promise<object>;
}

export class IdentityServiceProvider implements Provider<IdentityService> {
  constructor(
    // openstack must match the name property in the datasource json file
    @inject('datasources.openstack')
    protected dataSource: OpenstackDataSource = new OpenstackDataSource(),
  ) {}

  value(): Promise<IdentityService> {
    return getService(this.dataSource);
  }
}

export abstract class AuthWithOSIdentity {
  protected logger = factory.getLogger(
    'auth.process.AuthWithOSIdentity.' + this.authConfig.version,
  );

  constructor(
    protected authConfig: AuthConfig,
    protected application: RestApplication,
    protected identityService: IdentityService,
  ) {}

  abstract adminAuthToken(): Promise<AuthedToken>;
  abstract validateUserToken(
    userToken: string,
    tenantId?: string,
  ): Promise<AuthedToken>;

  // async bindIdentityService() {
  //   // TODO: use bind/inject to use IdentityService:
  //   // @inject('services.IdentityService') works differently within/outside of
  //   // Controller. It doesn't work outside of Controller. So here we make call
  //   // to Provider explicitly.
  //   await new IdentityServiceProvider().value().then(idenServ => {
  //     this.identityService = idenServ;
  //   });
  // }

  async solveAdminToken(): Promise<AuthedToken> {
    try {
      let authedToken = await this.application.get(
        WafBindingKeys.KeyInternalAdminTokenSingleton,
      );
      if (!authedToken.expired()) return authedToken;
      else throw new Error('admin token expires, re-authorizing.');
    } catch (error) {
      try {
        let authedToken = await this.adminAuthToken();
        this.application
          .bind(WafBindingKeys.KeyInternalAdminTokenSingleton)
          .to(authedToken);
        return authedToken;
      } catch (error) {
        this.logger.debug('solveAdminToken failed: ' + error.message);
        throw error;
      }
    }
  }
}

class AuthWithIdentityV2 extends AuthWithOSIdentity {
  async adminAuthToken(): Promise<AuthedToken> {
    let url = this.authConfig.osAuthUrl + '/tokens';
    let reqBody = {
      auth: {
        passwordCredentials: {
          username: this.authConfig.osUsername,
          password: this.authConfig.osPassword,
        },
        tenantId: this.authConfig.osTenantId,
      },
    };

    try {
      return this.identityService.v2AuthToken(url, reqBody).then(response => {
        this.logger.debug('adminAuthToken done.');
        this.logger.debug(JSON.stringify(response));
        return AuthedToken.buildWith(response);
      });
    } catch (error) {
      throw new Error('Failed to authorize admin token: ' + error.message);
    }
  }

  async validateUserToken(
    userToken: string,
    tenantId?: string,
  ): Promise<AuthedToken> {
    let adminToken = await this.application.get(
      WafBindingKeys.KeySolvedAdminToken,
    );

    let url = this.authConfig.osAuthUrl + '/tokens/' + userToken;
    if (tenantId) url = url + '?belongsTo=' + tenantId;

    try {
      return await this.identityService
        .v2ValidateToken(url, adminToken.token)
        .then(response => {
          return AuthedToken.buildWith(response);
        });
    } catch (error) {
      throw new Error('Failed to validate user token: ' + error.message);
    }
  }
}

class AuthWithIdentityV3 extends AuthWithOSIdentity {
  async adminAuthToken(): Promise<AuthedToken> {
    let url = this.authConfig.osAuthUrl + '/auth/tokens';
    let reqBody = {
      auth: {
        identity: {
          methods: ['password'],
          password: {
            user: {
              name: this.authConfig.osUsername,
              password: this.authConfig.osPassword,
              domain: {name: <string>this.authConfig.osDomainName},
            },
          },
        },
        scope: {
          project: {
            domain: {name: <string>this.authConfig.osDomainName},
            id: this.authConfig.osTenantId,
          },
        },
      },
    };

    try {
      return await this.identityService
        .v3AuthToken(url, reqBody)
        .then(response => {
          return AuthedToken.buildWith(response);
        });
    } catch (e) {
      throw new Error('Failed to authorize admin token: ' + e.message);
    }
  }

  async validateUserToken(
    userToken: string,
    tenantId?: string,
  ): Promise<AuthedToken> {
    let adminToken = await this.application.get(
      WafBindingKeys.KeySolvedAdminToken,
    );

    // tenantId is useless in v3/auth/tokens
    // since tenant info can be retrieved from token validation.
    let url = this.authConfig.osAuthUrl + '/auth/tokens';
    try {
      return await this.identityService
        .v3ValidateToken(url, adminToken.token, userToken)
        .then(response => {
          return AuthedToken.buildWith(response);
        });
    } catch (error) {
      throw new Error('Failed to validate user token: ' + error.message);
    }
  }
}

export class AuthWithIdentityUnknown extends AuthWithOSIdentity {
  adminAuthToken(): Promise<AuthedToken> {
    throw new Error('Not Implemented, unknown AuthWithOSIdentity.');
  }
  validateUserToken(userToken: string, tenantId: string): Promise<AuthedToken> {
    throw new Error('Not Implemented, unknown AuthWithOSIdentity.');
  }
}

// TODO: rename it to AuthFactory or so, so do other component.
export class AuthManager {
  private authConfig: AuthConfig = new AuthConfig();

  constructor(
    private application: RestApplication,
    private identityService: IdentityService,
  ) {
    let authProps: string[];
    let emptyProps: string[] = [];

    if (!process.env.OS_AUTH_URL || process.env.OS_AUTH_URL === '')
      throw new Error(`Not authorized, env OS_AUTH_URL not set`);

    this.authConfig.osAuthUrl = process.env.OS_AUTH_URL;

    if (process.env.OS_AUTH_URL.endsWith('/v2.0')) {
      this.authConfig.version = 'v2.0';
      authProps = ['OS_USERNAME', 'OS_PASSWORD', 'OS_TENANT_ID'];
    } else if (process.env.OS_AUTH_URL.endsWith('v3')) {
      this.authConfig.version = 'v3';
      authProps = [
        'OS_USERNAME',
        'OS_PASSWORD',
        'OS_TENANT_ID',
        'OS_DOMAIN_NAME',
      ];
    } else {
      authProps = [];
    }

    authProps.forEach(prop => {
      if (!process.env[prop] || process.env[prop] === '') emptyProps.push(prop);
    });
    if (emptyProps.length !== 0)
      throw new Error(`Not authorized, missing env variables: ${emptyProps}`);

    this.authConfig.osUsername = <string>process.env.OS_USERNAME;
    this.authConfig.osPassword = <string>process.env.OS_PASSWORD;
    this.authConfig.osTenantId = <string>process.env.OS_TENANT_ID;
    this.authConfig.osDomainName = process.env.OS_DOMAIN_NAME;

    return this;
  }

  createAuthWorker(): AuthWithOSIdentity {
    let authWithOSIdentity: AuthWithOSIdentity;

    switch (this.authConfig.version) {
      case 'v2.0':
        authWithOSIdentity = new AuthWithIdentityV2(
          this.authConfig,
          this.application,
          this.identityService,
        );
        break;
      case 'v3':
        authWithOSIdentity = new AuthWithIdentityV3(
          this.authConfig,
          this.application,
          this.identityService,
        );
        break;
      default:
        authWithOSIdentity = new AuthWithIdentityUnknown(
          this.authConfig,
          this.application,
          this.identityService,
        );
        break;
    }

    return authWithOSIdentity;
  }
}

class AuthConfig {
  version: string;
  osAuthUrl: string;
  osUsername: string;
  osPassword: string;
  osTenantId: string;
  osDomainName?: string;
}

export class AuthedToken {
  public token: string;
  public userId: string;
  public issuedAt: Date;
  public expiredAt: Date;
  public catalog: {
    endpoints: object[];
    type: string;
    name: string;
  }[];
  public tenantId: string;
  private region: string;
  private interface: string;

  private version: 'v2.0' | 'v3';

  private constructor() {
    if (process.env.OS_REGION_NAME && process.env.OS_REGION_NAME !== '')
      this.region = process.env.OS_REGION_NAME;
    else this.region = 'RegionOne';

    if (process.env.OS_INTERFACE && process.env.OS_INTERFACE !== '')
      this.interface = process.env.OS_INTERFACE;
    else this.interface = 'internal';
  }

  public static buildWith(response: object): AuthedToken {
    let v = AuthedToken.versionOf(response);
    let authedToken = new AuthedToken();
    switch (v) {
      case 'v2.0':
        return authedToken.buildV2_0(response).digExpired();

      case 'v3':
        return authedToken.buildV3(response).digExpired();

      default:
        throw new Error('Not recognized version: ' + v);
    }
  }

  private buildV2_0(response: object): AuthedToken {
    let respJson = JSON.parse(JSON.stringify(response));

    let access = respJson['body'][0]['access'];
    this.version = 'v2.0';
    this.issuedAt = new Date(access['token']['issued_at']);
    this.expiredAt = new Date(access['token']['expires']);
    this.token = access['token']['id'];
    this.userId = access['user']['id'];
    this.catalog = access['serviceCatalog'];
    this.tenantId = access['token']['tenant']
      ? access['token']['tenant']['id']
      : undefined;

    return this;
  }

  private buildV3(response: object): AuthedToken {
    let respJson = JSON.parse(JSON.stringify(response));

    let token = respJson['body'][0]['token'];
    this.version = 'v3';
    this.issuedAt = new Date(token['issued_at']);
    this.expiredAt = new Date(token['expires_at']);
    this.token = respJson['headers']['x-subject-token']; //key in lower case
    this.userId = token['user']['id'];
    this.catalog = token['catalog'];
    this.tenantId = token['project'] ? token['project']['id'] : undefined;

    return this;
  }

  private static versionOf(response: object): 'v2.0' | 'v3' | undefined {
    try {
      let resp = JSON.parse(JSON.stringify(response));
      if (!resp['body']) throw new Error('no "body"');

      // May be more points to check when more versions are added.
      if (resp['body'][0]['access']) return 'v2.0';
      else if (resp['body'][0]['token']) return 'v3';
    } catch (error) {
      throw new Error(
        'Invalid authed object, unable to parse: ' + error.message,
      );
    }
  }

  expired(): boolean {
    return this.expiredAt.getTime() - new Date().getTime() <= 0;
  }

  private digExpired() {
    // Make the duration time a little shorter then that of actually
    // to avoid token expiring error caused by time leak.
    let duration =
      ((this.expiredAt.getTime() - this.issuedAt.getTime()) * 4) / 5;
    this.expiredAt.setTime(Date.now() + duration);
    return this;
  }

  private endpointOf(inf: string, type: string): string {
    if (!this.catalog) throw new Error('catalog of authed token is empty.');

    switch (this.version) {
      case 'v2.0':
        return this.v2_0EndpointOf(inf, type);
      case 'v3':
        return this.v3EndpointOf(inf, type);
    }
  }

  private v2_0EndpointOf(inf: string, type: string): string {
    for (let ct of this.catalog) {
      if (ct.type !== type) continue;

      for (let ep of ct.endpoints) {
        let eJson = JSON.parse(JSON.stringify(ep));
        if (eJson['region'] !== this.region) continue;

        return eJson[inf + 'URL'];
      }
    }

    throw new Error(
      inf +
        ' endpoint for ' +
        type +
        ' in region: ' +
        this.region +
        ': not found in v2.0 authed token.',
    );
  }

  private v3EndpointOf(inf: string, type: string): string {
    for (let ct of this.catalog) {
      if (ct.type !== type) continue;

      for (let ep of ct.endpoints) {
        let eJson = JSON.parse(JSON.stringify(ep));
        if (eJson['region'] !== this.region) continue;
        if (eJson['interface'] !== inf) continue;

        return eJson['url'];
      }
    }

    throw new Error(
      inf +
        ' endpoint for ' +
        type +
        ' in region: ' +
        this.region +
        ': not found in v3 authed token.',
    );
  }

  private epNetwork(): string {
    return this.endpointOf(this.interface, 'network');
  }
  private epCompute(): string {
    return this.endpointOf(this.interface, 'compute');
  }

  public epPorts(): string {
    return this.epNetwork() + '/v2.0/ports';
  }

  public epSubnets(): string {
    return this.epNetwork() + '/v2.0/subnets';
  }

  // TODO: Use user token's catalog instead of that of admin's.
  public epServers(tenantId: string) {
    let url = this.epCompute();
    if (url.endsWith('v2.0'))
      return url.slice(0, url.lastIndexOf('/')) + '/' + tenantId + '/servers';
    else return url.replace(process.env.OS_TENANT_ID!, tenantId) + '/servers';
  }
}
