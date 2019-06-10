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
import {Pool, Member} from '../models';
import {PoolRepository, MemberRepository} from '../repositories';
import {Schema, Response, CollectionResponse} from '.';
import {BaseController} from './base.controller';
import {inject} from '@loopback/core';

const prefix = '/adcaas/v1';
const createDesc: string = 'Pool resource that need to be created';
const updateDesc: string = 'Pool resource properties that need to be updated';
const createMemberDesc: string = 'Member resource that need to be created';
const updateMemberDesc: string =
  'Member resource properties that need to be updated';

export class PoolController extends BaseController {
  constructor(
    @repository(PoolRepository)
    public poolRepository: PoolRepository,
    @repository(MemberRepository)
    public memberRepository: MemberRepository,
    @inject(RestBindings.Http.CONTEXT)
    protected reqCxt: RequestContext,
  ) {
    super(reqCxt);
  }

  @post(prefix + '/pools', {
    responses: {
      '200': Schema.response(Pool, 'Successfully create Pool resource'),
      '400': Schema.badRequest('Invalid Pool resource'),
      '422': Schema.unprocessableEntity('Unprocessable Pool resource'),
    },
  })
  async create(
    @requestBody(Schema.createRequest(Pool, createDesc))
    reqBody: Partial<Pool>,
  ): Promise<Response> {
    try {
      reqBody.tenantId = await this.tenantId;
      const data = await this.poolRepository.create(reqBody);
      return new Response(Pool, data);
    } catch (error) {
      throw new HttpErrors.BadRequest(error.message);
    }
  }

  @get(prefix + '/pools', {
    responses: {
      '200': Schema.collectionResponse(
        Pool,
        'Successfully retrieve Pool resources',
      ),
    },
  })
  async find(
    @param.query.object('filter', getFilterSchemaFor(Pool)) filter?: Filter,
  ): Promise<CollectionResponse> {
    const data = await this.poolRepository.find(filter, {
      tenantId: await this.tenantId,
    });
    return new CollectionResponse(Pool, data);
  }

  @get(prefix + '/pools/{poolId}', {
    responses: {
      '200': Schema.response(Pool, 'Successfully retrieve Pool resource'),
      '404': Schema.notFound('Can not find Pool resource'),
    },
  })
  async findById(
    @param(Schema.pathParameter('poolId', 'Pool resource ID'))
    id: string,
  ): Promise<Response> {
    const data = await this.poolRepository.findById(id, undefined, {
      tenantId: await this.tenantId,
    });
    return new Response(Pool, data);
  }

  @patch(prefix + '/pools/{poolId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully update Pool resource'),
      '404': Schema.notFound('Can not find Pool resource'),
    },
  })
  async updateById(
    @param(Schema.pathParameter('poolId', 'Pool resource ID'))
    id: string,
    @requestBody(Schema.updateRequest(Pool, updateDesc))
    pool: Partial<Pool>,
  ): Promise<void> {
    await this.poolRepository.updateById(id, pool, {
      tenantId: await this.tenantId,
    });
  }

  @del(prefix + '/pools/{poolId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully delete Pool resource'),
      '404': Schema.notFound('Can not find Pool resource'),
    },
  })
  async deleteById(
    @param(Schema.pathParameter('poolId', 'Pool resource ID'))
    id: string,
  ): Promise<void> {
    await this.poolRepository.deleteById(id, {
      tenantId: await this.tenantId,
    });
  }

  /**
   * These member control functions are moved to pool controller,
   * it is because of this issues:
   * https://github.com/strongloop/loopback/issues/4142
   */

  @post(prefix + '/pools/{poolId}/members', {
    responses: {
      '200': Schema.response(Member, 'Successfully create Member resource'),
      '400': Schema.badRequest('Invalid Member resource'),
      '422': Schema.unprocessableEntity('Unprocessable Member resource'),
    },
  })
  async createPoolMember(
    @param(Schema.pathParameter('poolId', 'Pool resource ID'))
    pool_id: string,
    @requestBody(Schema.createRequest(Member, createMemberDesc))
    member: Partial<Member>,
  ): Promise<Response> {
    member.tenantId = await this.tenantId;
    const data = await this.poolRepository.members(pool_id).create(member);
    return new Response(Member, data);
  }

  @get(prefix + '/pools/{poolId}/members/{memberId}', {
    responses: {
      '200': Schema.collectionResponse(
        Member,
        'Successfully retrieve member resources',
      ),
    },
  })
  async getMemberByID(
    @param(Schema.pathParameter('poolId', 'Pool resource ID'))
    pool_id: string,
    @param(Schema.pathParameter('memberId', 'Member resource ID'))
    member_id: string,
  ): Promise<CollectionResponse> {
    const data = await this.poolRepository
      .members(pool_id)
      .find({where: {and: [{id: member_id}, {tenantId: await this.tenantId}]}});

    return new CollectionResponse(Member, data);
  }

  @get(prefix + '/pools/{poolId}/members', {
    responses: {
      '200': Schema.collectionResponse(
        Member,
        'Successfully retrieve member resources by pool id',
      ),
    },
  })
  async getMembers(
    @param(Schema.pathParameter('poolId', 'Pool resource ID'))
    pool_id: string,
  ): Promise<CollectionResponse> {
    const data = await this.poolRepository
      .members(pool_id)
      .find({where: {tenantId: await this.tenantId}});
    return new CollectionResponse(Member, data);
  }

  @del(prefix + '/pools/{poolId}/members/{memberId}', {
    responses: {
      '204': {
        description: 'Member DELETE success',
      },
    },
  })
  async deleteMemberByID(
    @param(Schema.pathParameter('poolId', 'Pool resource ID'))
    pool_id: string,
    @param(Schema.pathParameter('memberId', 'Member resource ID'))
    member_id: string,
  ): Promise<void> {
    await this.poolRepository
      .members(pool_id)
      .delete({and: [{id: member_id}, {tenantId: await this.tenantId}]});
  }

  @patch(prefix + '/pools/{poolId}/members/{memberId}', {
    responses: {
      '200': {
        description: 'Member model instance',
        content: {'application/json': {schema: {'x-ts-type': Member}}},
      },
    },
  })
  async updateMemberByID(
    @param(Schema.pathParameter('poolId', 'Pool resource ID'))
    pool_id: string,
    @param(Schema.pathParameter('memberId', 'Member resource ID'))
    member_id: string,
    @requestBody(Schema.createRequest(Member, updateMemberDesc))
    member: Partial<Member>,
  ): Promise<void> {
    await this.poolRepository
      .members(pool_id)
      .patch(member, {and: [{id: member_id}, {tenantId: await this.tenantId}]});
  }
}
