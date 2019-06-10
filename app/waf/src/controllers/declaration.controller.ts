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
  patch,
  del,
  requestBody,
  HttpErrors,
  RequestContext,
  RestBindings,
} from '@loopback/rest';
import {
  Application,
  Declaration,
  Service,
  Endpointpolicy,
  Rule,
  Action,
  Pool,
  Member,
  ASGDeployRequest,
  AS3DeployRequest,
} from '../models';
import {inject} from '@loopback/core';
import {
  ApplicationRepository,
  DeclarationRepository,
  PoolRepository,
  PoolMonitorAssocRepository,
  MemberMonitorAssociationRepository,
  MonitorRepository,
  WafpolicyRepository,
  EndpointpolicyRepository,
  ServiceEndpointpolicyAssociationRepository,
  RuleRepository,
  ActionRepository,
  AdcRepository,
} from '../repositories';
import {BaseController, Schema, Response, CollectionResponse} from '.';
import {ASGManager} from '../services';
import {factory} from '../log4ts';

const prefix = '/adcaas/v1';

export class DeclarationController extends BaseController {
  protected logger = factory.getLogger('controllers.DeclarationController');

  constructor(
    @repository(ApplicationRepository)
    public applicationRepository: ApplicationRepository,
    @repository(DeclarationRepository)
    public declarationRepository: DeclarationRepository,
    @repository(PoolRepository)
    public poolRepository: PoolRepository,
    @repository(MonitorRepository)
    public monitorRepository: MonitorRepository,
    @repository(PoolMonitorAssocRepository)
    public poolMonitorAssociationRepository: PoolMonitorAssocRepository,
    @repository(MemberMonitorAssociationRepository)
    public memberMonitorAssociationRepository: MemberMonitorAssociationRepository,
    @repository(WafpolicyRepository)
    public wafpolicyRepository: WafpolicyRepository,
    @repository(EndpointpolicyRepository)
    public endpointpolicyRepository: EndpointpolicyRepository,
    @repository(ServiceEndpointpolicyAssociationRepository)
    public serviceEndpointpolicyAssociationRepository: ServiceEndpointpolicyAssociationRepository,
    @repository(RuleRepository)
    public ruleRepository: RuleRepository,
    @repository(ActionRepository)
    public actionRepository: ActionRepository,
    @repository(AdcRepository)
    public adcRepository: AdcRepository,
    //Suppress get injection binding exeption by using {optional: true}
    @inject(RestBindings.Http.CONTEXT, {optional: true})
    protected reqCxt: RequestContext,
  ) {
    super(reqCxt);
  }

  private async loadApplication(app: Application): Promise<void> {
    app.services = await this.applicationRepository.services(app.id).find();

    for (let service of app.services) {
      await this.loadService(service);
    }
  }

  private async loadService(service: Service): Promise<void> {
    if (service.defaultPoolId) {
      service.defaultPool = await this.poolRepository.findById(
        service.defaultPoolId,
      );
      await this.loadPool(service.defaultPool);
    }

    let assocs = await this.serviceEndpointpolicyAssociationRepository.find({
      where: {
        serviceId: service.id,
      },
    });

    let policyIds = assocs.map(({endpointpolicyId}) => endpointpolicyId);
    service.policies = await this.endpointpolicyRepository.find({
      where: {
        id: {
          inq: policyIds,
        },
      },
    });

    for (let policy of service.policies) {
      await this.loadEndpointpolicy(policy);
    }
  }

  private async loadPool(pool: Pool): Promise<void> {
    pool.members = await this.poolRepository.members(pool.id).find();

    for (let member of pool.members) {
      await this.loadMember(member);
    }

    let assocs = await this.poolMonitorAssociationRepository.find({
      where: {
        poolId: pool.id,
      },
    });

    let monitorIds = assocs.map(({monitorId}) => monitorId);
    pool.monitors = await this.monitorRepository.find({
      where: {
        id: {
          inq: monitorIds,
        },
      },
    });
  }

  private async loadMember(member: Member): Promise<void> {
    let assocs = await this.memberMonitorAssociationRepository.find({
      where: {
        memberId: member.id,
      },
    });

    let monitorIds = assocs.map(({monitorId}) => monitorId);
    member.monitors = await this.monitorRepository.find({
      where: {
        id: {
          inq: monitorIds,
        },
      },
    });
  }

  private async loadEndpointpolicy(policy: Endpointpolicy): Promise<void> {
    policy.rules = await this.endpointpolicyRepository.rules(policy.id).find();

    if (policy.rules.length === 0) {
      throw new HttpErrors.UnprocessableEntity(
        'Endpoint Policy ' + policy.id + ' has no rule',
      );
    }

    for (let rule of policy.rules) {
      await this.loadRule(rule);
    }
  }

  private async loadRule(rule: Rule): Promise<void> {
    rule.conditions = await this.ruleRepository.conditions(rule.id).find();
    rule.actions = await this.ruleRepository.actions(rule.id).find();

    for (let action of rule.actions) {
      await this.loadAction(action);
    }
  }

  private async loadAction(action: Action): Promise<void> {
    if (action.type === 'waf' && action.policy) {
      action.wafpolicy = await this.wafpolicyRepository.findById(action.policy);
    }
  }

  @post(prefix + '/applications/{applicationId}/declarations', {
    responses: {
      '200': Schema.response(
        Declaration,
        'Successfully create Declaration resource',
      ),
      '422': Schema.unprocessableEntity('Fail to create Declaration resource'),
    },
  })
  async create(
    @param(Schema.pathParameter('applicationId', 'Application resource ID'))
    id: string,
    @requestBody(
      Schema.createRequest(
        Declaration,
        'Declaration resource that need to be created',
      ),
    )
    reqBody: Partial<Declaration>,
  ): Promise<Response> {
    // Throws HTTP 404, if application does not exist
    let app = await this.applicationRepository.findById(id, undefined, {
      tenantId: await this.tenantId,
    });
    await this.loadApplication(app);

    Object.assign(reqBody, {
      tenantId: app.tenantId,
      content: app.getAS3Declaration(),
    });

    let declaration = await this.applicationRepository
      .declarations(id)
      .create(reqBody);

    return new Response(Declaration, declaration);
  }

  @get(prefix + '/applications/{applicationId}/declarations', {
    responses: {
      '200': Schema.collectionResponse(
        Declaration,
        'Successfully retrieve Declaration resources',
      ),
    },
  })
  async find(
    @param(Schema.pathParameter('applicationId', 'Application resource ID'))
    id: string,
  ): Promise<CollectionResponse> {
    return new CollectionResponse(
      Declaration,
      await this.applicationRepository.declarations(id).find({
        where: {
          tenantId: await this.tenantId,
        },
      }),
    );
  }

  @get(prefix + '/applications/{applicationId}/declarations/{declarationId}', {
    responses: {
      '200': Schema.response(
        Declaration,
        'Successfully retrieve Declaration resources',
      ),
      '404': Schema.notFound('Can not find Declaration resource'),
    },
  })
  async findByID(
    @param(Schema.pathParameter('applicationId', 'Application resource ID'))
    applicationId: string,
    @param(Schema.pathParameter('declarationId', 'Declaration resource ID'))
    declarationId: string,
  ): Promise<Response> {
    let declarations = await this.applicationRepository
      .declarations(applicationId)
      .find({
        where: {
          and: [
            {
              id: declarationId,
            },
            {
              tenantId: await this.tenantId,
            },
          ],
        },
      });

    if (declarations.length === 0) {
      throw new HttpErrors.NotFound('Cannot find Declaration');
    } else {
      return new Response(Declaration, declarations[0]);
    }
  }

  @patch(
    prefix + '/applications/{applicationId}/declarations/{declarationId}',
    {
      responses: {
        '204': Schema.emptyResponse('Successfully update Declaration resource'),
        '404': Schema.notFound('Can not find Declaration resource'),
      },
    },
  )
  async updateByID(
    @param(Schema.pathParameter('applicationId', 'Application resource ID'))
    applicationId: string,
    @param(Schema.pathParameter('declarationId', 'Declaration resource ID'))
    declarationId: string,
    @requestBody(
      Schema.updateRequest(
        Application,
        'Declaration resource properties that need to be updated',
      ),
    )
    declaration: Partial<Declaration>,
  ): Promise<void> {
    let declarations = await this.applicationRepository
      .declarations(applicationId)
      .find({
        where: {
          and: [
            {
              id: declarationId,
            },
            {
              tenantId: await this.tenantId,
            },
          ],
        },
      });

    if (declarations.length === 0) {
      throw new HttpErrors.NotFound('Cannot find Declaration');
    } else {
      await this.applicationRepository
        .declarations(applicationId)
        .patch(declaration, {id: declarationId});
    }
  }

  @del(prefix + '/applications/{applicationId}/declarations/{declarationId}', {
    responses: {
      '204': Schema.emptyResponse('Successfully delete Declaration resource'),
      '404': Schema.notFound('Can not find Declaration resource'),
    },
  })
  async deleteByID(
    @param(Schema.pathParameter('applicationId', 'Application resource ID'))
    applicationId: string,
    @param(Schema.pathParameter('declarationId', 'Declaration resource ID'))
    declarationId: string,
  ) {
    await this.applicationRepository
      .declarations(applicationId)
      .delete({and: [{id: declarationId}, {tenantId: await this.tenantId}]});
  }

  @post(
    prefix +
      '/applications/{applicationId}/declarations/{declarationId}/deploy',
    {
      responses: {
        '204': Schema.emptyResponse('Successfully deploy Declaration resource'),
        '404': Schema.notFound('Can not find Declaration resource'),
        '422': Schema.unprocessableEntity(
          'Fail to deploy Declaration resource',
        ),
      },
    },
  )
  async proxyDeploy(
    @param(Schema.pathParameter('applicationId', 'Application resource ID'))
    applicationId: string,
    @param(Schema.pathParameter('declarationId', 'Declaration resource ID'))
    declarationId: string,
    @requestBody(
      Schema.createRequest(
        ASGDeployRequest,
        'Deploy the declaration on an ADC.',
      ),
    )
    deployBody: ASGDeployRequest,
  ): Promise<void> {
    let adcId = deployBody.adcId!;
    await Promise.all([
      this.applicationRepository.findById(applicationId, undefined, {
        tenantId: await this.tenantId,
      }),
      this.declarationRepository.findById(declarationId, undefined, {
        tenantId: await this.tenantId,
      }),
      this.adcRepository.findById(adcId, undefined, {
        tenantId: await this.tenantId,
      }),
    ]).then(
      async ([application, declaration, adc]) => {
        // TODO: uncomment it; use adcstate control: gotTo(Active)
        // if (adc.status !== AdcState.ACTIVE || !adc.management) {
        //   throw new HttpErrors.UnprocessableEntity('ADC resource is not ready for deploy.');
        // }

        let mgmt = adc.management!;
        let proxyMgr = await ASGManager.instanlize();

        try {
          let as3Request = new AS3DeployRequest(adc, application, declaration);
          await proxyMgr.deploy(
            mgmt.ipAddress,
            mgmt.tcpPort,
            as3Request.declaration,
          );
        } catch (error) {
          this.logger.error(`Failed to deploy: ${error.message}`);
          throw new HttpErrors.UnprocessableEntity(error.message);
        }
      },
      error => {
        throw new HttpErrors.NotFound(error.message);
      },
    );
  }
}
