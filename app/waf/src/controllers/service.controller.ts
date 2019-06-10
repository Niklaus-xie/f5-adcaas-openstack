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
import {Service, Endpointpolicy} from '../models';
import {
  ServiceRepository,
  ApplicationRepository,
  EndpointpolicyRepository,
  ServiceEndpointpolicyAssociationRepository,
} from '../repositories';
import {BaseController, Schema, Response, CollectionResponse} from '.';
import {inject} from '@loopback/core';

const prefix = '/adcaas/v1';

const createDesc = 'Service resource that need to be created';
const updateDesc = 'Service resource properties that need to be updated';

export class ServiceController extends BaseController {
  constructor(
    @repository(ServiceRepository)
    public serviceRepository: ServiceRepository,
    @repository(ApplicationRepository)
    public applicationRepository: ApplicationRepository,
    @repository(EndpointpolicyRepository)
    public endpointpolicyRepository: EndpointpolicyRepository,
    @repository(ServiceEndpointpolicyAssociationRepository)
    public serviceEndpointpolicyAssociationRepository: ServiceEndpointpolicyAssociationRepository,
    @inject(RestBindings.Http.CONTEXT)
    protected reqCxt: RequestContext,
  ) {
    super(reqCxt);
  }

  @get(prefix + '/services', {
    responses: {
      '200': Schema.response(Service, 'Successfully retrieve Service resource'),
    },
  })
  async find(
    @param.query.object('filter', getFilterSchemaFor(Service)) filter?: Filter,
  ): Promise<CollectionResponse> {
    let data = await this.serviceRepository.find(filter, {
      tenantId: await this.tenantId,
    });
    return new CollectionResponse(Service, data);
  }

  @get(prefix + '/services/{serviceId}', {
    responses: {
      '200': Schema.response(Service, 'Successfully retrieve Service resource'),
      '404': Schema.notFound('Can not find Service resource'),
    },
  })
  async findById(
    @param(Schema.pathParameter('serviceId', 'Service resource ID')) id: string,
  ): Promise<Response> {
    let data = await this.serviceRepository.findById(id, undefined, {
      tenantId: await this.tenantId,
    });
    return new Response(Service, data);
  }

  @post(prefix + '/services', {
    responses: {
      '200': Schema.response(Service, 'Successfully create Service resource'),
      '400': Schema.badRequest('Invalid Service resource'),
      '422': Schema.unprocessableEntity('Unprocessable Service resource'),
    },
  })
  async create(
    @requestBody(Schema.createRequest(Service, createDesc))
    service: Service,
  ): Promise<Response> {
    const appId = service.applicationId;
    delete service.applicationId;
    service.tenantId = await this.tenantId;
    return new Response(
      Service,
      await this.applicationRepository.services(appId).create(service),
    );
  }

  @patch(prefix + '/services/{serviceId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully update Service resource'),
      '404': Schema.notFound('Can not find Service resource'),
    },
  })
  async updateById(
    @param(Schema.pathParameter('serviceId', 'Service resource ID')) id: string,
    @requestBody(Schema.updateRequest(Service, updateDesc))
    service: Partial<Service>,
  ): Promise<void> {
    await this.serviceRepository.updateById(id, service, {
      tenantId: await this.tenantId,
    });
  }

  @del(prefix + '/services/{serviceId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully delete Service resource'),
      '404': Schema.notFound('Can not find Service resource'),
    },
  })
  async deleteById(
    @param(Schema.pathParameter('serviceId', 'Service resource ID')) id: string,
  ): Promise<void> {
    await this.serviceRepository.deleteById(id, {
      tenantId: await this.tenantId,
    });
  }

  @post(prefix + '/services/{serviceId}/endpointpolicies/{endpointpolicyId}', {
    responses: {
      '204': Schema.emptyResponse(
        'Successfully associate Service and Endpoint Policy',
      ),
      '404': Schema.notFound(
        'Cannot find Service resource or Endpoint Policy resource',
      ),
    },
  })
  async associatePolicy(
    @param(Schema.pathParameter('serviceId', 'Service resource ID'))
    serviceId: string,
    @param(
      Schema.pathParameter('endpointpolicyId', 'Endpoint Policy resource ID'),
    )
    endpointpolicyId: string,
  ): Promise<void> {
    // Throws HTTP 404, if Service or Endpoint Policy not found.
    await this.serviceRepository.findById(serviceId, undefined, {
      tenantId: await this.tenantId,
    });
    await this.endpointpolicyRepository.findById(endpointpolicyId, undefined, {
      tenantId: await this.tenantId,
    });
    await this.serviceEndpointpolicyAssociationRepository.create({
      serviceId: serviceId,
      endpointpolicyId: endpointpolicyId,
    });
  }

  @get(prefix + '/services/{serviceId}/endpointpolicies', {
    responses: {
      '200': Schema.collectionResponse(
        Endpointpolicy,
        'Successfully retrieve Endpoint Policy resources',
      ),
    },
  })
  async findPolicies(
    @param(Schema.pathParameter('serviceId', 'Service resource ID')) id: string,
  ): Promise<CollectionResponse> {
    let assocs = await this.serviceEndpointpolicyAssociationRepository.find({
      where: {
        serviceId: id,
      },
    });

    let policyIds = assocs.map(({endpointpolicyId}) => endpointpolicyId);
    return new CollectionResponse(
      Endpointpolicy,
      await this.endpointpolicyRepository.find(
        {
          where: {
            id: {
              inq: policyIds,
            },
          },
        },
        {tenantId: await this.tenantId},
      ),
    );
  }

  @get(prefix + '/services/{serviceId}/endpointpolicies/{endpointpolicyId}', {
    responses: {
      '200': Schema.response(
        Endpointpolicy,
        'Successfully retrieve Endpoint Policy resource',
      ),
    },
  })
  async findPolicy(
    @param(Schema.pathParameter('serviceId', 'Service resource ID'))
    serviceId: string,
    @param(
      Schema.pathParameter('endpointpolicyId', 'Endpoint Policy resource ID'),
    )
    endpointpolicyId: string,
  ): Promise<Response> {
    let assocs = await this.serviceEndpointpolicyAssociationRepository.find({
      where: {
        serviceId: serviceId,
        endpointpolicyId: endpointpolicyId,
      },
    });

    if (assocs.length === 0) {
      throw new HttpErrors.NotFound('Cannot find association.');
    } else {
      return new Response(
        Endpointpolicy,
        await this.endpointpolicyRepository.findById(
          assocs[0].endpointpolicyId,
          undefined,
          {tenantId: await this.tenantId},
        ),
      );
    }
  }

  @del(prefix + '/services/{serviceId}/endpointpolicies/{endpointpolicyId}', {
    responses: {
      '204': Schema.emptyResponse(
        'Successfully deassociate Service and Endpoint Policy',
      ),
    },
  })
  async deassociatePolicy(
    @param(Schema.pathParameter('serviceId', 'Service resource ID'))
    serviceId: string,
    @param(
      Schema.pathParameter('endpointpolicyId', 'Endpoint Policy resource ID'),
    )
    endpointpolicyId: string,
  ): Promise<void> {
    await this.serviceRepository.findById(serviceId, undefined, {
      tenantId: await this.tenantId,
    });
    await this.endpointpolicyRepository.findById(endpointpolicyId, undefined, {
      tenantId: await this.tenantId,
    });
    await this.serviceEndpointpolicyAssociationRepository.deleteAll({
      serviceId: serviceId,
      endpointpolicyId: endpointpolicyId,
    });
  }
}
