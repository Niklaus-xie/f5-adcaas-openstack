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

import {Filter, repository} from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  patch,
  del,
  requestBody,
  HttpErrors,
  RequestContext,
  RestBindings,
} from '@loopback/rest';
import {Monitor} from '../models';
import {MonitorRepository} from '../repositories';
import {Schema, Response, CollectionResponse} from '.';
import {BaseController} from './base.controller';
import {inject} from '@loopback/core';

const prefix = '/adcaas/v1';
const createDesc: string = 'Monitor resource that need to be created';
const updateDesc: string =
  'Monitor resource properties that need to be updated';

export class MonitorController extends BaseController {
  constructor(
    @repository(MonitorRepository)
    public monitorRepository: MonitorRepository,
    @inject(RestBindings.Http.CONTEXT)
    protected reqCxt: RequestContext,
  ) {
    super(reqCxt);
  }

  @post(prefix + '/monitors', {
    responses: {
      '200': Schema.response(Monitor, 'Successfully create Monitor resource'),
      '400': Schema.badRequest('Invalid Monitor resource'),
      '422': Schema.unprocessableEntity('Unprocessable Monitor resource'),
    },
  })
  async create(
    @requestBody(Schema.createRequest(Monitor, createDesc))
    reqBody: Partial<Monitor>,
  ): Promise<Response> {
    try {
      reqBody.tenantId = await this.tenantId;
      const data = await this.monitorRepository.create(reqBody);
      return new Response(Monitor, data);
    } catch (error) {
      throw new HttpErrors.BadRequest(error.message);
    }
  }

  @get(prefix + '/monitors', {
    responses: {
      '200': Schema.collectionResponse(
        Monitor,
        'Successfully retrieve Monitor resources',
      ),
    },
  })
  async find(
    @param.query.object('filter', getFilterSchemaFor(Monitor)) filter?: Filter,
  ): Promise<CollectionResponse> {
    let data = await this.monitorRepository.find(filter, {
      tenantId: await this.tenantId,
    });
    return new CollectionResponse(Monitor, data);
  }

  @get(prefix + '/monitors/{monitorId}', {
    responses: {
      responses: {
        '200': Schema.response(Monitor, 'Successfully retrieve Pool resource'),
        '404': Schema.notFound('Can not find Pool resource'),
      },
    },
  })
  async findById(
    @param(Schema.pathParameter('monitorId', 'Monitor resource ID'))
    id: string,
  ): Promise<Response> {
    const data = await this.monitorRepository.findById(id, undefined, {
      tenantId: await this.tenantId,
    });
    return new Response(Monitor, data);
  }

  @patch(prefix + '/monitors/{monitorId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully update Monitor resource'),
      '404': Schema.notFound('Can not find Monitor resource'),
    },
  })
  async updateById(
    @param(Schema.pathParameter('monitorId', 'Monitor resource ID'))
    id: string,
    @requestBody(Schema.createRequest(Monitor, updateDesc))
    monitor: Monitor,
  ): Promise<void> {
    await this.monitorRepository.updateById(id, monitor, {
      tenantId: await this.tenantId,
    });
  }

  @del(prefix + '/monitors/{monitorId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully delete Monitor resource'),
      '404': Schema.notFound('Can not find Monitor resource'),
    },
  })
  async deleteById(
    @param(Schema.pathParameter('monitorId', 'Monitor resource ID'))
    id: string,
  ): Promise<void> {
    await this.monitorRepository.deleteById(id, {
      tenantId: await this.tenantId,
    });
  }
}
