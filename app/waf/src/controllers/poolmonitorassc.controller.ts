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

import {repository} from '@loopback/repository';
import {
  post,
  param,
  get,
  del,
  HttpErrors,
  RequestContext,
  RestBindings,
} from '@loopback/rest';
import {Monitor, Pool} from '../models';
import {
  PoolMonitorAssocRepository,
  PoolRepository,
  MonitorRepository,
} from '../repositories';
import {Schema, Response, CollectionResponse} from '.';
import {BaseController} from './base.controller';
const prefix = '/adcaas/v1';
import {inject} from '@loopback/core';

export class PoolMonitorAssocationController extends BaseController {
  constructor(
    @repository(PoolMonitorAssocRepository)
    public poolmonitorassocRepository: PoolMonitorAssocRepository,
    @repository(PoolRepository)
    public poolRepository: PoolRepository,
    @repository(MonitorRepository)
    public mointorRepository: MonitorRepository,
    @inject(RestBindings.Http.CONTEXT)
    protected reqCxt: RequestContext,
  ) {
    super(reqCxt);
  }

  @post(prefix + '/pools/{poolId}/monitors/{monitorId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully associate Pool and Monitor'),
      '404': Schema.notFound('Cannot find Pool resource or Monitor resource'),
    },
  })
  async create(
    @param(Schema.pathParameter('poolId', 'Pool resource ID'))
    poolId: string,
    @param(Schema.pathParameter('monitorId', 'Pool resource ID'))
    monitorId: string,
  ): Promise<void> {
    await this.poolRepository.findById(poolId, undefined, {
      tenantId: await this.tenantId,
    });
    await this.mointorRepository.findById(monitorId, undefined, {
      tenantId: await this.tenantId,
    });
    await this.poolmonitorassocRepository.create({
      poolId: poolId,
      monitorId: monitorId,
    });
  }

  @get(prefix + '/pools/{poolId}/monitors', {
    responses: {
      '200': Schema.collectionResponse(
        Monitor,
        'Successfully retrieve Monitor resources',
      ),
    },
  })
  async findMonitors(
    @param(Schema.pathParameter('poolId', 'Pool resource ID')) id: string,
  ): Promise<CollectionResponse> {
    let assocs = await this.poolmonitorassocRepository.find({
      where: {
        poolId: id,
      },
    });

    let monitorIds = assocs.map(({monitorId}) => monitorId);
    return new CollectionResponse(
      Monitor,
      await this.mointorRepository.find(
        {
          where: {
            id: {
              inq: monitorIds,
            },
          },
        },
        {tenantId: await this.tenantId},
      ),
    );
  }

  @get(prefix + '/pools/{poolId}/monitors/{monitorId}', {
    responses: {
      '200': Schema.response(Monitor, 'Successfully retrieve Monitor resource'),
    },
  })
  async findMointor(
    @param(Schema.pathParameter('poolId', 'Pool resource ID'))
    poolId: string,
    @param(Schema.pathParameter('monitorId', 'Pool resource ID'))
    monitorId: string,
  ): Promise<Response> {
    let assocs = await this.poolmonitorassocRepository.find({
      where: {
        poolId: poolId,
        monitorId: monitorId,
      },
    });

    if (assocs.length === 0) {
      throw new HttpErrors.NotFound('Cannot find association.');
    } else {
      return new Response(
        Monitor,
        await this.mointorRepository.findById(assocs[0].monitorId, undefined, {
          tenantId: await this.tenantId,
        }),
      );
    }
  }

  @get(prefix + '/monitors/{monitorId}/pools', {
    responses: {
      '200': Schema.collectionResponse(
        Pool,
        'Successfully retrieve Pool resources',
      ),
    },
  })
  async findPools(
    @param(Schema.pathParameter('monitorId', 'Monitor resource ID'))
    id: string,
  ): Promise<CollectionResponse> {
    let assocs = await this.poolmonitorassocRepository.find({
      where: {
        monitorId: id,
      },
    });

    let poolIds = assocs.map(({poolId}) => poolId);
    return new CollectionResponse(
      Pool,
      await this.poolRepository.find(
        {
          where: {
            id: {
              inq: poolIds,
            },
          },
        },
        {tenantId: await this.tenantId},
      ),
    );
  }

  @get(prefix + '/monitors/{monitorId}/pools/{poolId}', {
    responses: {
      '200': Schema.response(Pool, 'Successfully retrieve Pool resource'),
    },
  })
  async findPool(
    @param(Schema.pathParameter('poolId', 'Pool resource ID'))
    poolId: string,
    @param(Schema.pathParameter('monitorId', 'Pool resource ID'))
    monitorId: string,
  ): Promise<Response> {
    let assocs = await this.poolmonitorassocRepository.find({
      where: {
        poolId: poolId,
        monitorId: monitorId,
      },
    });

    if (assocs.length === 0) {
      throw new HttpErrors.NotFound('Cannot find association.');
    } else {
      return new Response(
        Pool,
        await this.poolRepository.findById(assocs[0].poolId, undefined, {
          tenantId: await this.tenantId,
        }),
      );
    }
  }

  @del(prefix + '/pools/{poolId}/monitors/{monitorId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully deassociate Pool and Monitor '),
    },
  })
  async deleteById(
    @param(Schema.pathParameter('poolId', 'Pool resource ID'))
    poolId: string,
    @param(Schema.pathParameter('monitorId', 'Pool resource ID'))
    monitorId: string,
  ): Promise<void> {
    await this.poolRepository.findById(poolId, undefined, {
      tenantId: await this.tenantId,
    });
    await this.mointorRepository.findById(monitorId, undefined, {
      tenantId: await this.tenantId,
    });
    await this.poolmonitorassocRepository.deleteAll({
      poolId: poolId,
      monitorId: monitorId,
    });
  }
}
