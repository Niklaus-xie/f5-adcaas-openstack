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

import {Entity, AnyObject} from '@loopback/repository';
import {ParameterObject, ParameterLocation} from '@loopback/openapi-v3-types';
import {MetadataInspector} from '@loopback/metadata';
import {MODEL_PROPERTIES_KEY, PropertyDefinition} from '@loopback/repository';

let plural = require('plural');

class SchemaProperties {
  public create: {[key: string]: object} = {};
  public update: {[key: string]: object} = {};
  public response: {[key: string]: object} = {};
  public required: string[] = [];
  public createExample: {[key: string]: object} = {};
  public updateExample: {[key: string]: object} = {};
  public responseExample: {[key: string]: object} = {};
}

let schemaMap: {[key: string]: SchemaProperties} = {};

export function buildProperties(entity: typeof Entity): SchemaProperties {
  let entityKey = entity.modelName;
  let props = schemaMap[entityKey];

  if (props) {
    return props;
  }

  props = new SchemaProperties();

  let metadata =
    MetadataInspector.getAllPropertyMetadata<PropertyDefinition>(
      MODEL_PROPERTIES_KEY,
      entity.prototype,
    ) || {};

  for (let key in metadata) {
    let meta = metadata[key];
    let schema = meta.schema;

    if (schema) {
      if (schema.create) {
        props.create[key] = {
          type: meta.type,
        };
        props.createExample[key] = schema.example;
      }

      if (schema.update) {
        props.update[key] = {
          type: meta.type,
        };
        props.updateExample[key] = schema.example;
      }

      if (schema.response) {
        props.response[key] = {
          type: meta.type,
        };
        props.responseExample[key] = schema.example;
      }

      if (schema.required) {
        props.required.push(key);
      }
    }
  }

  schemaMap[entityKey] = props;

  return props;
}

function buildParameterSchema(
  name: string,
  location: ParameterLocation,
  required: boolean,
  type: string,
  format: string,
  description: string,
): ParameterObject {
  return {
    name: name,
    description: description,
    in: location,
    required: required,
    schema: {
      type: type,
      format: format,
    },
  };
}

function buildRequestSchema(
  description: string,
  requiredProperties: string[],
  properties: object,
  example: object,
): object {
  return {
    description: description,
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          required: requiredProperties,
          properties: properties,
          example: example,
        },
      },
    },
  };
}

function buildResponseSchema(
  name: string,
  properties: object,
  example: object,
): object {
  let resp: {[key: string]: object} = {};
  resp[name] = {
    type: 'object',
    properties: properties,
    example: example,
  };

  return {
    schema: {
      type: 'object',
      properties: resp,
    },
  };
}

function buildResponse(t: typeof Entity, data: Entity) {
  let props = buildProperties(t);
  let resp = {};

  for (let key in props.response) {
    if (props.response[key]) {
      Object.assign(resp, {[key]: (data as AnyObject)[key]});
    }
  }

  return resp;
}

function buildCollectionResponseSchema(
  name: string,
  properties: object,
  example: object,
): object {
  let resp: {[key: string]: object} = {};
  resp[name] = {
    type: 'array',
    items: {
      type: 'object',
      properties: properties,
      example: example,
    },
  };

  return {
    schema: {
      type: 'object',
      properties: resp,
    },
  };
}

function buildErrorResponseSchema(desc: string, example: object): object {
  return {
    description: desc,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
            message: {
              type: 'string',
            },
            code: {
              type: 'string',
            },
            details: {
              type: 'array',
            },
          },
          example: example,
        },
      },
    },
  };
}

export class Schema {
  private constructor() {}

  static pathParameter(name: string, desc: string): ParameterObject {
    return buildParameterSchema(name, 'path', true, 'string', '', desc);
  }

  static createRequest(entity: typeof Entity, desc: string): object {
    let props = buildProperties(entity);
    return buildRequestSchema(
      desc,
      props.required,
      props.create,
      props.createExample,
    );
  }

  static updateRequest(entity: typeof Entity, desc: string): object {
    let props = buildProperties(entity);
    return buildRequestSchema(desc, [], props.update, props.updateExample);
  }

  static emptyResponse(desc: string): object {
    return {
      description: desc,
    };
  }

  static response(entity: typeof Entity, desc: string): object {
    let props = buildProperties(entity);
    return {
      description: desc,
      content: {
        'application/json': buildResponseSchema(
          entity.modelName.toLowerCase(),
          props.response,
          props.responseExample,
        ),
      },
    };
  }

  static collectionResponse(entity: typeof Entity, desc: string): object {
    let props = buildProperties(entity);
    return {
      description: desc,
      content: {
        'application/json': buildCollectionResponseSchema(
          plural(entity.modelName.toLowerCase()),
          props.response,
          props.responseExample,
        ),
      },
    };
  }

  static badRequest(desc: string, example?: object): object {
    return buildErrorResponseSchema(
      desc,
      Object.assign(
        {
          statusCode: 400,
          name: 'BadRequestError',
        },
        example,
      ),
    );
  }

  static notFound(desc: string, example?: object): object {
    return buildErrorResponseSchema(
      desc,
      Object.assign(
        {
          statusCode: 404,
          name: 'Error',
          code: 'ENTITY_NOT_FOUND',
        },
        example,
      ),
    );
  }

  static unprocessableEntity(desc: string, example?: object): object {
    return buildErrorResponseSchema(
      desc,
      Object.assign(
        {
          statusCode: 422,
          name: 'UnprocessableEntityError',
          message:
            'The request body is invalid. See error object `details` property for more info.',
          code: 'VALIDATION_FAILED',
        },
        example,
      ),
    );
  }
}

export class Response {
  [key: string]: object;

  constructor(t: typeof Entity, data: Entity) {
    this[t.modelName.toLowerCase()] = buildResponse(t, data);
  }
}

export class CollectionResponse {
  [key: string]: object[];

  constructor(t: typeof Entity, data: Entity[]) {
    let collection = [];
    for (let elem of data) {
      collection.push(buildResponse(t, elem));
    }
    this[plural(t.modelName.toLowerCase())] = collection;
  }
}
