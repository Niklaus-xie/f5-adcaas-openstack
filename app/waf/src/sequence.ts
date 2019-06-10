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

import {inject} from '@loopback/context';
import {
  FindRoute,
  InvokeMethod,
  ParseParams,
  Reject,
  RequestContext,
  RestBindings,
  Send,
  SequenceHandler,
  HttpErrors,
} from '@loopback/rest';
import {factory} from './log4ts';
import {AuthWithOSIdentity, AuthedToken} from './services';
import {CoreBindings} from '@loopback/core';
import {WafApplication} from '.';
import {WafBindingKeys} from './keys';

const SequenceActions = RestBindings.SequenceActions;

export class MySequence implements SequenceHandler {
  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS) protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) public send: Send,
    @inject(SequenceActions.REJECT) public reject: Reject,
    @inject('logger', {optional: true})
    private logger = factory.getLogger('api.call'),
    @inject(WafBindingKeys.KeyAuthWithOSIdentity)
    private authWithOSIdentity: AuthWithOSIdentity,
    @inject(CoreBindings.APPLICATION_INSTANCE)
    private application: WafApplication,
  ) {}

  async handle(context: RequestContext) {
    await this.logRequest(context);

    let result: object = {};
    try {
      const {request, response} = context;

      await this.authRequest(context);

      const route = this.findRoute(request);
      const args = await this.parseParams(request, route);

      result = await this.invoke(route, args);
      this.send(response, result);
    } catch (err) {
      this.reject(context, err);
    } finally {
      await this.logResponse(context, result);
    }
  }

  async logRequest(context: RequestContext): Promise<void> {
    const req = context.request;
    const logObj = {
      uuid: context.name,
      method: req.method,
      headers: req.headers,
      path: req.path,
      params: req.params,
      body: req.body,
      cookies: req.cookies,
      // others.
    };
    this.logger.info('Request: ' + JSON.stringify(logObj));
  }
  async logResponse(context: RequestContext, result: object): Promise<void> {
    const res = context.response;

    const logObj = {
      uuid: context.name,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      headers: res.getHeaders(),
      body: result,
    };

    this.logger.info('Response: ' + JSON.stringify(logObj));
  }

  async authRequest(context: RequestContext) {
    if (!process.env.PRODUCT_RELEASE) return;

    let {request} = context;

    this.logger.debug('start to authenticate user');

    let hdrToken = request.header('X-Auth-Token');
    if (typeof hdrToken !== typeof '') {
      throw new HttpErrors.Unauthorized(
        'Unauthorized: invalid X-Auth-Token header.',
      );
    }

    let userToken: AuthedToken;
    try {
      userToken = await this.authWithOSIdentity
        .validateUserToken(<string>hdrToken)
        .then(authedObj => {
          this.logger.debug(`Authenticated OK: Request ID(${context.name})`);
          //this.logger.debug(JSON.stringify(authedObj));
          return authedObj;
        });
    } catch (error) {
      throw new HttpErrors.Unauthorized(error.message);
    }

    if (request.headers['tenant-id']) {
      userToken.tenantId = <string>request.headers['tenant-id'];
    }
    if (!userToken.tenantId || userToken.tenantId === '') {
      throw new HttpErrors.BadRequest('BadRequest: tenant id is not provided');
    }

    context.bind(WafBindingKeys.Request.KeyTenantId).to(userToken.tenantId);
    context.bind(WafBindingKeys.Request.KeyUserToken).to(userToken.token);
  }
}
