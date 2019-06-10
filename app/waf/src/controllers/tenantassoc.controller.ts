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
import {post, param, get, del, HttpErrors} from '@loopback/rest';
import {Adc} from '../models';
import {AdcTenantAssociationRepository, AdcRepository} from '../repositories';
import {Schema, Response, CollectionResponse} from '.';

const prefix = '/adcaas/v1';

export class TenantAssociationController {
  constructor(
    @repository(AdcTenantAssociationRepository)
    public adcTenantAssociationRepository: AdcTenantAssociationRepository,
    @repository(AdcRepository)
    public adcRepository: AdcRepository,
  ) {}

  @post(prefix + '/tenants/{tenantId}/adcs/{adcId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully associate ADC and Tenant'),
      '404': Schema.notFound('Cannot find ADC resource'),
    },
  })
  async associateAdc(
    @param(Schema.pathParameter('tenantId', 'OpenStack project ID'))
    tenantId: string,
    @param(Schema.pathParameter('adcId', 'ADC resource ID')) adcId: string,
  ): Promise<void> {
    // Throws HTTP 404, if ADC not found.
    await this.adcRepository.findById(adcId);
    await this.adcTenantAssociationRepository.create({
      adcId: adcId,
      tenantId: tenantId,
    });
  }

  @get(prefix + '/tenants/{tenantId}/adcs', {
    responses: {
      '200': Schema.collectionResponse(
        Adc,
        'Successfully retrieve ADCs associated with Tenant',
      ),
    },
  })
  async findAdcs(
    @param(Schema.pathParameter('tenantId', 'OpenStack Project ID')) id: string,
  ): Promise<CollectionResponse> {
    let assocs = await this.adcTenantAssociationRepository.find({
      where: {
        tenantId: id,
      },
    });

    let adcIds = assocs.map(({adcId}) => adcId);
    return new CollectionResponse(
      Adc,
      await this.adcRepository.find({
        where: {
          id: {
            inq: adcIds,
          },
        },
      }),
    );
  }

  @get(prefix + '/tenants/{tenantId}/adcs/{adcId}', {
    responses: {
      '200': Schema.response(
        Adc,
        'Successfully retrieve ADC associated with Tenant',
      ),
      '404': Schema.notFound('Cannot find assoociation or ADC resource'),
    },
  })
  async findAdc(
    @param(Schema.pathParameter('tenantId', 'Tenant resource ID'))
    tenantId: string,
    @param(Schema.pathParameter('adcId', 'ADC resource ID')) adcId: string,
  ): Promise<Response> {
    let assocs = await this.adcTenantAssociationRepository.find({
      where: {
        adcId: adcId,
        tenantId: tenantId,
      },
    });

    if (assocs.length === 0) {
      throw new HttpErrors.NotFound('Cannot find association.');
    } else {
      // Throws HTTP 404, if ADC not found
      return new Response(
        Adc,
        await this.adcRepository.findById(assocs[0].adcId),
      );
    }
  }

  @del(prefix + '/tenants/{tenantId}/adcs/{adcId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully deassociate ADC and Tenant'),
    },
  })
  async deassociateAdc(
    @param(Schema.pathParameter('tenantId', 'OpenStack Project ID'))
    tenantId: string,
    @param(Schema.pathParameter('adcId', 'ADC resource ID')) adcId: string,
  ): Promise<void> {
    await this.adcTenantAssociationRepository.deleteAll({
      adcId: adcId,
      tenantId: tenantId,
    });
  }
}
