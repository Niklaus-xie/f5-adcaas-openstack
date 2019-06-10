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
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getFilterSchemaFor,
  getWhereSchemaFor,
  patch,
  del,
  requestBody,
  RequestContext,
  RestBindings,
  HttpErrors,
} from '@loopback/rest';
import {Wafpolicy, Adc, WafpolicyOnDevice} from '../models';
import {WafpolicyRepository, AdcRepository} from '../repositories';
import {Schema, Response, CollectionResponse} from '.';
import {BaseController} from './base.controller';
import {inject} from '@loopback/core';
import {ASGService, ASGManager} from '../services';

const prefix = '/adcaas/v1';

export class WafpolicyController extends BaseController {
  asgMgr: ASGManager;

  constructor(
    @repository(WafpolicyRepository)
    public wafpolicyRepository: WafpolicyRepository,
    @repository(AdcRepository)
    public adcRepository: AdcRepository,
    @inject(RestBindings.Http.CONTEXT, {optional: true})
    protected reqCxt: RequestContext,
    @inject('services.ASGService')
    public asgService: ASGService,
  ) {
    super(reqCxt);
    this.asgMgr = new ASGManager(this.asgService);
  }

  @post(prefix + '/wafpolicies', {
    responses: {
      '200': Schema.response(
        Wafpolicy,
        'Successfully create WAF Policy resource',
      ),
      '400': Schema.badRequest('Invalid WAF Policy resource'),
      '422': Schema.unprocessableEntity('Unprocessable WAF Policy resource'),
    },
  })
  async create(
    @requestBody(
      Schema.createRequest(
        Wafpolicy,
        'WAF Policy resource that need to be created',
      ),
    )
    wafpolicy: Partial<Wafpolicy>,
  ): Promise<Response> {
    wafpolicy.tenantId = await this.tenantId;
    return new Response(
      Wafpolicy,
      await this.wafpolicyRepository.create(wafpolicy),
    );
  }

  @get(prefix + '/wafpolicies/count', {
    responses: {
      '200': {
        description: 'Wafpolicy model count',
        content: {'application/json': {schema: CountSchema}},
      },
    },
  })
  async count(
    @param.query.object('where', getWhereSchemaFor(Wafpolicy)) where?: Where,
  ): Promise<Count> {
    return await this.wafpolicyRepository.count(where);
  }

  @get(prefix + '/wafpolicies', {
    responses: {
      '200': Schema.collectionResponse(
        Wafpolicy,
        'Successfully retrieve WAF Policy resources',
      ),
    },
  })
  async find(
    @param.query.object('filter', getFilterSchemaFor(Wafpolicy))
    filter?: Filter,
  ): Promise<CollectionResponse> {
    return new CollectionResponse(
      Wafpolicy,
      await this.wafpolicyRepository.find({
        where: {or: [{tenantId: await this.tenantId}, {public: true}]},
      }),
    );
  }

  @get(prefix + '/wafpolicies/{id}', {
    responses: {
      '200': Schema.response(
        Wafpolicy,
        'Successfully retrieve WAF Policy resource',
      ),
      '404': Schema.notFound('Can not find WAF Policy resource'),
    },
  })
  async findById(
    @param(Schema.pathParameter('id', 'WAF Policy resource ID')) id: string,
  ): Promise<Response> {
    return new Response(
      Wafpolicy,
      await this.wafpolicyRepository.findById(id, {
        where: {
          and: [
            {or: [{tenantId: await this.tenantId}, {public: true}]},
            {id: id},
          ],
        },
      }),
    );
  }

  @post(prefix + '/wafpolicies/{id}/adcs/{adcId}', {
    responses: {
      '204': Schema.emptyResponse('Uploading WAF Policy resource'),
      '404': Schema.notFound('Can not find trustedDeivceId'),
      '422': Schema.unprocessableEntity(' Adc is not trusted'),
    },
  })
  async wafpolicyUpload(
    @param(Schema.pathParameter('id', 'WAF Policy resource ID')) id: string,
    @param(Schema.pathParameter('adcId', 'ADC resource ID')) adcId: string,
  ): Promise<void> {
    let wafpolicy: Wafpolicy = await this.wafpolicyRepository.findById(id, {
      where: {
        and: [
          {or: [{tenantId: await this.tenantId}, {public: true}]},
          {id: id},
        ],
      },
    });

    let adc: Adc = await this.adcRepository.findById(adcId, undefined, {
      tenantId: await this.tenantId,
    });

    if (adc.trustedDeviceId === undefined) {
      throw new HttpErrors.UnprocessableEntity(`Adc: ${adc.id} is not trusted`);
    }

    // TODO: ADC and wafpolicy are many-to-many relationship,
    // relationship check need here in some day.
    try {
      await this.asgMgr.wafpolicyUploadByUrl(
        wafpolicy.url,
        adc.trustedDeviceId,
        wafpolicy.id,
      );
    } catch (error) {
      throw new HttpErrors.unprocessableEntity(
        'upload wafpolicy to asg service failed',
      );
    }
  }

  @get(prefix + '/wafpolicies/{id}/adcs/{adcId}', {
    responses: {
      '200': 'Status of wafpolicy',
      '404': Schema.notFound('Can not find relative resource'),
      '422': Schema.unprocessableEntity(' Adc is not trusted'),
    },
  })
  async wafpolicyCheckStatus(
    @param(Schema.pathParameter('id', 'WAF Policy resource ID')) id: string,
    @param(Schema.pathParameter('adcId', 'ADC resource ID')) adcId: string,
  ): Promise<Response> {
    let wafpolicy: Wafpolicy = await this.wafpolicyRepository.findById(id, {
      where: {
        and: [
          {or: [{tenantId: await this.tenantId}, {public: true}]},
          {id: id},
        ],
      },
    });

    // TODO: there is no many-to-many relationship for now

    let adc: Adc = await this.adcRepository.findById(adcId, undefined, {
      tenantId: await this.tenantId,
    });

    if (adc.trustedDeviceId === undefined) {
      throw new HttpErrors.UnprocessableEntity(`Adc: ${adc.id} is not trusted`);
    }

    // TODO: ADC and wafpolicy are many-to-many relationship,
    // relationship check need here in some day.
    let resp = undefined;
    try {
      resp = await this.asgMgr.wafpolicyCheckByName(
        adc.trustedDeviceId,
        wafpolicy.id,
      );
    } catch (error) {
      throw new HttpErrors.unprocessableEntity(
        'check wafpolicy from asg service failed',
      );
    }

    if (!resp || !resp[0]) {
      throw new HttpErrors.NotFound(
        `wafpolicy: ${wafpolicy.id} is not found in ASG`,
      );
    }

    let wafpolicyOnDeviceResp = new WafpolicyOnDevice(wafpolicy);
    wafpolicyOnDeviceResp.state = resp[0].state;

    return new Response(WafpolicyOnDevice, wafpolicyOnDeviceResp);
  }

  @patch(prefix + '/wafpolicies/{id}', {
    responses: {
      '204': Schema.emptyResponse('Successfully update WAF Policy resource'),
      '404': Schema.notFound('Can not find ADC resource'),
    },
  })
  async updateById(
    @param(Schema.pathParameter('id', 'WAF Policy resource ID')) id: string,
    @requestBody(
      Schema.updateRequest(
        Wafpolicy,
        'WAF Policy resource properties that need to be updated',
      ),
    )
    wafpolicy: Partial<Wafpolicy>,
  ): Promise<void> {
    await this.wafpolicyRepository.updateById(id, wafpolicy, {
      tenantId: await this.tenantId,
    });
  }

  @del(prefix + '/wafpolicies/{id}', {
    responses: {
      '204': Schema.emptyResponse('Successfully delete WAF Policy resource'),
      '404': Schema.notFound('Can not find WAF Policy resource'),
    },
  })
  async deleteById(
    @param(Schema.pathParameter('id', 'WAF Policy resource ID')) id: string,
  ): Promise<void> {
    await this.wafpolicyRepository.deleteById(id, {
      tenantId: await this.tenantId,
    });
  }
}
