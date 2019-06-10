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

import {HttpErrors} from '@loopback/rest';
import {ExpectedData} from '../controllers/mocks/mock.openstack.controller';

export const StubResponses = {
  response400: () => {
    throw new HttpErrors.Unauthorized(
      JSON.stringify({
        error: {
          message: 'Expecting to f.... e in error.',
          code: 400,
          title: 'Bad Request',
        },
      }),
    );
  },

  response401: () => {
    throw new HttpErrors.Unauthorized(
      JSON.stringify({
        error: {
          message: 'The request you have made requires authentication.',
          code: 401,
          title: 'Unauthorized',
        },
      }),
    );
  },

  response403: () => {
    throw new HttpErrors.Forbidden(
      JSON.stringify({
        forbidden: {
          message:
            'Quota exceeded for instances: Requested 1, but already used 10 of 10 instances',
          code: 403,
        },
      }),
    );
  },

  response404: () => {
    throw new HttpErrors.NotFound(
      JSON.stringify({
        itemNotFound: {
          message:
            'Instance da0f83c5-a2d1-4abe-b1d3-c8ae5b774534s could not be found.',
          code: 404,
        },
      }),
    );
  },

  v2AuthToken200: () => {
    return {
      access: {
        token: {
          issued_at: '2019-03-13T06:31:03.000000Z',
          expires: '2020-05-02T22:31:03Z',
          id: ExpectedData.userToken,
          tenant: {
            description: 'admin tenant',
            enabled: true,
            id: 'fde45211da0a44ecbf38cb0b644ab30d',
            name: 'admin',
          },
          audit_ids: ['PGH3khYCThGlNngmcfVnTQ'],
        },
        serviceCatalog: [
          {
            endpoints: [
              {
                adminURL:
                  'http://localhost:8774/v2/fde45211da0a44ecbf38cb0b644ab30d',
                region: 'RegionOne',
                internalURL:
                  'http://localhost:8774/v2/fde45211da0a44ecbf38cb0b644ab30d',
                id: '43275deab0f043e0a02b49517fdce1fd',
                publicURL:
                  'http://localhost:8774/v2/fde45211da0a44ecbf38cb0b644ab30d',
              },
            ],
            endpoints_links: [],
            type: 'compute',
            name: 'nova',
          },
          {
            endpoints: [
              {
                adminURL: 'http://localhost:9696',
                region: 'RegionOne',
                internalURL: 'http://localhost:9696',
                id: '5a02ce706ba9428fa3c1056c95260f8b',
                publicURL: 'http://localhost:9696',
              },
            ],
            endpoints_links: [],
            type: 'network',
            name: 'neutron',
          },
          {
            endpoints: [
              {
                adminURL: 'http://localhost:8774/v3',
                region: 'RegionOne',
                internalURL: 'http://localhost:8774/v3',
                id: '2e731e724978457cb86457baba948789',
                publicURL: 'http://localhost:8774/v3',
              },
            ],
            endpoints_links: [],
            type: 'computev3',
            name: 'novav3',
          },
          {
            endpoints: [
              {
                adminURL: 'http://localhost:9292',
                region: 'RegionOne',
                internalURL: 'http://localhost:9292',
                id: '351173636a92491699361a9894017954',
                publicURL: 'http://localhost:9292',
              },
            ],
            endpoints_links: [],
            type: 'image',
            name: 'Image Service',
          },
          {
            endpoints: [
              {
                adminURL: 'http://localhost:9311',
                region: 'RegionOne',
                internalURL: 'http://localhost:9311',
                id: '5b07b7c63835447d9821f9a8610b3d86',
                publicURL: 'http://localhost:9311',
              },
            ],
            endpoints_links: [],
            type: 'key-manager',
            name: 'barbican',
          },
          {
            endpoints: [
              {
                adminURL: 'http://localhost:35357/v2.0',
                region: 'RegionOne',
                internalURL: 'http://localhost:5000/v2.0',
                id: '67cc91a7bc0842588bc934ff54c22846',
                publicURL: 'http://localhost:5000/v2.0',
              },
            ],
            endpoints_links: [],
            type: 'identity',
            name: 'keystone',
          },
        ],
        user: {
          username: 'admin',
          roles_links: [],
          id: '2d26c96aa0f345eaafc3f5b50d2bbd8e',
          roles: [
            {
              name: 'admin',
            },
          ],
          name: 'admin',
        },
        metadata: {
          is_admin: 0,
          roles: ['c98d2a4914664025991d28f0e827902f'],
        },
      },
    };
  },

  v3AuthToken200: () => {
    return {
      token: {
        methods: ['password'],
        roles: [
          {
            id: 'c98d2a4914664025991d28f0e827902f',
            name: 'admin',
          },
        ],
        expires_at: '2020-05-03T02:15:58.000000Z',
        project: {
          domain: {
            id: 'default',
            name: 'Default',
          },
          id: 'fde45211da0a44ecbf38cb0b644ab30d',
          name: 'admin',
        },
        catalog: [
          {
            endpoints: [
              {
                region_id: 'RegionOne',
                url: 'http://localhost:9292',
                region: 'RegionOne',
                interface: 'admin',
                id: '351173636a92491699361a9894017954',
              },
              {
                region_id: 'RegionOne',
                url: 'http://localhost:9292',
                region: 'RegionOne',
                interface: 'public',
                id: '7ae412ce62ab4c05a9bd5dc76deca46e',
              },
              {
                region_id: 'RegionOne',
                url: 'http://localhost:9292',
                region: 'RegionOne',
                interface: 'internal',
                id: 'e60ea61c20cf4d03a03aa34c08270146',
              },
            ],
            type: 'image',
            id: '2c348b43e94548a1ac8652c324f2cabf',
            name: 'Image Service',
          },
          {
            endpoints: [
              {
                region_id: 'RegionOne',
                url: 'http://localhost:9311',
                region: 'RegionOne',
                interface: 'admin',
                id: '5b07b7c63835447d9821f9a8610b3d86',
              },
              {
                region_id: 'RegionOne',
                url: 'http://localhost:9311',
                region: 'RegionOne',
                interface: 'internal',
                id: '738d3a2fc62e4d958929c5879b965614',
              },
              {
                region_id: 'RegionOne',
                url: 'http://localhost:9311',
                region: 'RegionOne',
                interface: 'public',
                id: 'b49ee322b147431fad88e06e0e903412',
              },
            ],
            type: 'key-manager',
            id: '2e9775eb13924c64aa67fbfd213775bc',
            name: 'barbican',
          },
          {
            endpoints: [
              {
                region_id: 'RegionOne',
                url: 'http://localhost:35357/v2.0',
                region: 'RegionOne',
                interface: 'admin',
                id: '67cc91a7bc0842588bc934ff54c22846',
              },
              {
                region_id: 'RegionOne',
                url: 'http://localhost:5000/v2.0',
                region: 'RegionOne',
                interface: 'public',
                id: 'd219ddf34dda4b5e9c0f2c3c572d9def',
              },
              {
                region_id: 'RegionOne',
                url: 'http://localhost:5000/v2.0',
                region: 'RegionOne',
                interface: 'internal',
                id: 'f84f401b1e2d462b8bdb416e4e24c90a',
              },
            ],
            type: 'identity',
            id: '2f75e3e8e08c4fb297ed0b0704e30858',
            name: 'keystone',
          },
          {
            endpoints: [
              {
                region_id: 'RegionOne',
                url:
                  'http://localhost:8774/v2/fde45211da0a44ecbf38cb0b644ab30d',
                region: 'RegionOne',
                interface: 'internal',
                id: '43275deab0f043e0a02b49517fdce1fd',
              },
              {
                region_id: 'RegionOne',
                url:
                  'http://localhost:8774/v2/fde45211da0a44ecbf38cb0b644ab30d',
                region: 'RegionOne',
                interface: 'admin',
                id: '901e5640d926405e8a45d213ec6580fd',
              },
              {
                region_id: 'RegionOne',
                url:
                  'http://localhost:8774/v2/fde45211da0a44ecbf38cb0b644ab30d',
                region: 'RegionOne',
                interface: 'public',
                id: 'c776745dbad64475a020e219b636894d',
              },
            ],
            type: 'compute',
            id: '4444a4a5c17a4912b95fcf2f84034059',
            name: 'nova',
          },
          {
            endpoints: [
              {
                region_id: 'RegionOne',
                url: 'http://localhost:8774/v3',
                region: 'RegionOne',
                interface: 'public',
                id: '2e731e724978457cb86457baba948789',
              },
              {
                region_id: 'RegionOne',
                url: 'http://localhost:8774/v3',
                region: 'RegionOne',
                interface: 'admin',
                id: '48f8a773a40b4bdeaa85edf41464175e',
              },
              {
                region_id: 'RegionOne',
                url: 'http://localhost:8774/v3',
                region: 'RegionOne',
                interface: 'internal',
                id: 'e5352a8c8aa9425ca3c75b5d9ad32156',
              },
            ],
            type: 'computev3',
            id: '8fed3c480b184ee6a0c8250372c3f6bf',
            name: 'novav3',
          },
          {
            endpoints: [
              {
                region_id: 'RegionOne',
                url: 'http://localhost:9696',
                region: 'RegionOne',
                interface: 'public',
                id: '5a02ce706ba9428fa3c1056c95260f8b',
              },
              {
                region_id: 'RegionOne',
                url: 'http://localhost:9696',
                region: 'RegionOne',
                interface: 'admin',
                id: '5fa4669b03da4e8081289c1c119e678e',
              },
              {
                region_id: 'RegionOne',
                url: 'http://localhost:9696',
                region: 'RegionOne',
                interface: 'internal',
                id: 'e0fe35ed923f4c719637d7c104dd3687',
              },
            ],
            type: 'network',
            id: 'ebf0ace7c2b0477ea2fb27c25f3d04a0',
            name: 'neutron',
          },
        ],
        user: {
          domain: {
            id: 'default',
            name: 'Default',
          },
          id: ExpectedData.userId,
          name: 'admin',
        },
        audit_ids: ['FIddBgDDQUKTwLMRjRxswA'],
        issued_at: '2019-03-13T10:15:58.000000Z',
      },
    };
  },

  novaCreateVM200: () => {
    return {
      server: {
        security_groups: [
          {
            name: 'default',
          },
        ],
        'OS-DCF:diskConfig': 'AUTO',
        id: ExpectedData.serverId,
        links: [
          {
            href:
              'http://localhost:8774/v2/ef9fd3e3df664e558f043bd24c1fca21/servers/bbed9da3-ca5f-46b8-b945-01047a21edea',
            rel: 'self',
          },
          {
            href:
              'http://localhost:8774/ef9fd3e3df664e558f043bd24c1fca21/servers/bbed9da3-ca5f-46b8-b945-01047a21edea',
            rel: 'bookmark',
          },
        ],
        adminPass: 'ka5J4qZAbSUA',
      },
    };
  },

  novaDeleteVM200: () => {},

  novaGetVMDetail200: () => {
    return {
      server: {
        'OS-EXT-STS:task_state': null,
        addresses: {
          f5_test_net: [
            {
              'OS-EXT-IPS-MAC:mac_addr': 'fa:16:3e:53:96:a7',
              version: 4,
              addr: '10.1.1.9',
              'OS-EXT-IPS:type': 'fixed',
            },
          ],
        },
        links: [
          {
            href:
              'http://localhost:8774/v2/ef9fd3e3df664e558f043bd24c1fca21/servers/da0f83c5-a2d1-4abe-b1d3-c8ae5b774534',
            rel: 'self',
          },
          {
            href:
              'http://localhost:8774/ef9fd3e3df664e558f043bd24c1fca21/servers/da0f83c5-a2d1-4abe-b1d3-c8ae5b774534',
            rel: 'bookmark',
          },
        ],
        image: {
          id: '646fa39c-0a51-45d5-a1e7-3d401bd1a284',
          links: [
            {
              href:
                'http://localhost:8774/ef9fd3e3df664e558f043bd24c1fca21/images/646fa39c-0a51-45d5-a1e7-3d401bd1a284',
              rel: 'bookmark',
            },
          ],
        },
        'OS-EXT-STS:vm_state': 'active',
        'OS-EXT-SRV-ATTR:instance_name': 'instance-00000008',
        'OS-SRV-USG:launched_at': '2019-03-14T01:32:02.000000',
        flavor: {
          id: '1',
          links: [
            {
              href:
                'http://localhost:8774/ef9fd3e3df664e558f043bd24c1fca21/flavors/1',
              rel: 'bookmark',
            },
          ],
        },
        id: ExpectedData.serverId,
        security_groups: [
          {
            name: 'default',
          },
        ],
        user_id: '4d8d505a3c8e4d5bad9431878dcb9f4e',
        'OS-DCF:diskConfig': 'AUTO',
        accessIPv4: '',
        accessIPv6: '',
        progress: 0,
        'OS-EXT-STS:power_state': 1,
        'OS-EXT-AZ:availability_zone': 'nova',
        metadata: {},
        status: 'ACTIVE',
        updated: '2019-03-14T01:32:02Z',
        hostId: 'c06ef6ce91ceb3f9e01e48560c8906c1b3b82e03185466ea23d70413',
        'OS-EXT-SRV-ATTR:host': 'rdo-rhel-mitaka-2.novalocal',
        'OS-SRV-USG:terminated_at': null,
        key_name: null,
        'OS-EXT-SRV-ATTR:hypervisor_hostname': 'rdo-rhel-mitaka-2.novalocal',
        name: 'vm-9540',
        created: '2019-03-14T01:31:59Z',
        tenant_id: 'ef9fd3e3df664e558f043bd24c1fca21',
        'os-extended-volumes:volumes_attached': [],
        config_drive: '',
      },
    };
  },

  neutronCreatePort200: () => {
    return {
      port: {
        status: 'DOWN',
        'binding:host_id': '',
        description: '',
        allowed_address_pairs: [],
        tags: [],
        extra_dhcp_opts: [],
        updated_at: '2019-03-14T03:16:34Z',
        device_owner: '',
        revision_number: 4,
        'binding:profile': {},
        fixed_ips: [
          {
            subnet_id: '86f9f11b-0895-4af7-b3cf-71acda85f1db',
            ip_address: ExpectedData.bigipMgmt.ipAddr,
          },
        ],
        id: ExpectedData.portId,
        security_groups: ['24989b80-aacd-4c74-aabd-dcb1f55e5012'],
        device_id: '',
        name: 'port-port-name-729171',
        admin_state_up: true,
        network_id: '89449ba4-34f8-404d-93f6-fd1fd8a8296e',
        tenant_id: 'ef9fd3e3df664e558f043bd24c1fca21',
        'binding:vif_details': {},
        'binding:vnic_type': 'normal',
        'binding:vif_type': 'unbound',
        mac_address: ExpectedData.bigipMgmt.macAddr,
        project_id: 'ef9fd3e3df664e558f043bd24c1fca21',
        created_at: '2019-03-14T03:16:34Z',
      },
    };
  },

  neutronDeletePort200: () => {},

  neutronGetSubnets200: () => {
    return {
      subnets: [
        {
          description: '',
          enable_dhcp: true,
          network_id: '68d40e08-c825-4a56-8321-f1c171303b9d',
          tenant_id: 'fde45211da0a44ecbf38cb0b644ab30d',
          created_at: '2018-08-30T06:05:41',
          dns_nameservers: [],
          updated_at: '2018-10-22T08:09:32',
          gateway_ip: '10.0.0.1',
          ipv6_ra_mode: null,
          allocation_pools: [
            {
              start: '10.0.0.2',
              end: '10.0.0.254',
            },
          ],
          host_routes: [],
          ip_version: 4,
          ipv6_address_mode: null,
          cidr: '10.0.0.0/24',
          id: '1f02e13a-1c1e-497c-acb4-6bcb733341b7',
          subnetpool_id: null,
          name: 'f5_test_subnet',
        },
        {
          description: '',
          enable_dhcp: true,
          network_id: ExpectedData.bigipMgmt.networkId,
          tenant_id: 'fde45211da0a44ecbf38cb0b644ab30d',
          created_at: '2019-03-08T16:54:37',
          dns_nameservers: [],
          updated_at: '2019-03-08T16:54:37',
          gateway_ip: '10.1.1.1',
          ipv6_ra_mode: null,
          allocation_pools: [
            {
              start: '10.1.1.2',
              end: '10.1.1.254',
            },
          ],
          host_routes: [],
          ip_version: 4,
          ipv6_address_mode: null,
          cidr: ExpectedData.bigipMgmt.ipPoolCIDR,
          id: '7d3b71b8-932c-4c23-9635-17316e2b29aa',
          subnetpool_id: null,
          name: 'another',
        },
        {
          description: '',
          enable_dhcp: false,
          network_id: '7088474a-9fa2-48d9-a97f-a967dc1f7487',
          tenant_id: 'fde45211da0a44ecbf38cb0b644ab30d',
          created_at: '2018-08-29T08:38:18',
          dns_nameservers: [],
          updated_at: '2018-08-29T08:38:18',
          gateway_ip: '172.24.4.225',
          ipv6_ra_mode: null,
          allocation_pools: [
            {
              start: '172.24.4.226',
              end: '172.24.4.238',
            },
          ],
          host_routes: [],
          ip_version: 4,
          ipv6_address_mode: null,
          cidr: '172.24.4.224/28',
          id: '3db5044f-4a5d-44b1-a7c5-00095b06e6c4',
          subnetpool_id: null,
          name: 'public_subnet',
        },
        {
          description: '',
          enable_dhcp: true,
          network_id: '0e51e68c-08f7-4e32-af54-328d29b93467',
          tenant_id: 'fde45211da0a44ecbf38cb0b644ab30d',
          created_at: '2019-03-04T06:17:29',
          dns_nameservers: [],
          updated_at: '2019-03-04T06:17:29',
          gateway_ip: '192.168.3.1',
          ipv6_ra_mode: null,
          allocation_pools: [
            {
              start: '192.168.3.2',
              end: '192.168.3.254',
            },
          ],
          host_routes: [],
          ip_version: 4,
          ipv6_address_mode: null,
          cidr: '192.168.3.0/24',
          id: 'e45b1350-bfa3-41b4-a14f-cadd8a059277',
          subnetpool_id: null,
          name: 'test-subnet',
        },
        {
          description: '',
          enable_dhcp: true,
          network_id: '3eb161f5-4d60-4a9d-8908-46c05f1f93ca',
          tenant_id: 'fde45211da0a44ecbf38cb0b644ab30d',
          created_at: '2019-04-09T09:26:59',
          dns_nameservers: [],
          updated_at: '2019-04-09T09:26:59',
          gateway_ip: '172.16.11.1',
          ipv6_ra_mode: null,
          allocation_pools: [
            {
              start: '172.16.11.2',
              end: '172.16.11.254',
            },
          ],
          host_routes: [],
          ip_version: 4,
          ipv6_address_mode: null,
          cidr: '172.16.11.0/24',
          id: '664b189f-4d74-4b2c-9b27-fab8d3ecd1ce',
          subnetpool_id: null,
          name: 'f5_test_mgmt_sub',
        },
        {
          description: '',
          enable_dhcp: true,
          network_id: 'bb3d76a8-d24b-487e-b4b5-a82b03ddd446',
          tenant_id: '0dfc2e39eb83466a805983426f8d8e9b',
          created_at: '2018-08-29T08:38:29',
          dns_nameservers: [],
          updated_at: '2018-08-29T08:38:29',
          gateway_ip: '10.0.0.1',
          ipv6_ra_mode: null,
          allocation_pools: [
            {
              start: '10.0.0.2',
              end: '10.0.0.254',
            },
          ],
          host_routes: [],
          ip_version: 4,
          ipv6_address_mode: null,
          cidr: '10.0.0.0/24',
          id: '76084ccf-a3a7-4b69-aad6-fd881e5d3715',
          subnetpool_id: null,
          name: 'private_subnet',
        },
      ],
    };
  },

  bigipNoLicense200: () => {
    return {
      kind: 'tm:sys:license:licensestats',
      selfLink: 'https://localhost/mgmt/tm/sys/license?ver=13.1.1',
      apiRawValues: {
        apiAnonymous: "Can't load license, may not be operational\n",
      },
    };
  },

  bigipLiense200: () => {
    return {
      entries: {
        'https://localhost/mgmt/tm/sys/license/0': {
          nestedStats: {
            entries: {
              'https://localhost/mgmt/tm/sys/license/0/active-modules': {
                nestedStats: {
                  entries: {
                    'https://localhost/mgmt/tm/sys/license/0/active-modules/%22APM,%20Base,%20VE%20GBB%20(500%20CCU,%202500%20Access%20Sessions)%22': {
                      nestedStats: {
                        entries: {
                          featureModules: {
                            description:
                              '{ "Anti-Virus Checks" "Base Endpoint Security Checks" "Firewall Checks" "Network Access" "Secure Virtual Keyboard" "APM, Web Application" "Machine Certificate Checks" "Protected Workspace" "Remote Desktop" "App Tunnel" }',
                          },
                          key: {
                            description: 'EQUYKXX-AOPHOGH',
                          },
                        },
                      },
                    },
                    'https://localhost/mgmt/tm/sys/license/0/active-modules/%22Best%20Bundle,%20VE-25M%22': {
                      nestedStats: {
                        entries: {
                          featureModules: {
                            description:
                              '{ "Rate Shaping" "Routing Bundle, VE" "ASM, VE" "DNS-GTM, Base, 25M" "SSL, VE" "Max Compression, VE" "AFM, VE" "DNSSEC" "PSM, VE" "VE, Carrier Grade NAT (AFM ONLY)" }',
                          },
                          key: {
                            description: 'FXKFKXF-QWEDEWW',
                          },
                        },
                      },
                    },
                  },
                },
              },
              licenseEndDate: {
                description: '2019/06/22',
              },
              licenseStartDate: {
                description: '2019/05/06',
              },
              licensedOnDate: {
                description: '2019/05/07',
              },
              licensedVersion: {
                description: '6.1.0',
              },
              platformId: {
                description: 'Z100',
              },
              registrationKey: {
                description: 'JTSCD-MTSZS-MHVKG-YDMJY-XVSECOT',
              },
              serviceCheckDate: {
                description: '2019/05/04',
              },
            },
          },
        },
      },
      kind: 'tm:sys:license:licensestats',
      selfLink: 'https://localhost/mgmt/tm/sys/license?ver=13.1.1',
    };
  },

  bigipCmDevice200: () => {
    return {
      items: [
        {
          managementIp: ExpectedData.bigipMgmt.ipAddr,
          configsyncIp: '1.2.3.4',
        },
      ],
    };
  },

  bigipGlobalSettings200: () => {
    return {
      awsApiMaxConcurrency: 1,
      consoleInactivityTimeout: 0,
      customAddr: 'none',
      failsafeAction: 'go-offline-restart-tm',
      fileBlacklistPathPrefix:
        '{/shared/3dns/} {/shared/bin/} {/shared/core/} {/appdata/core/} {/shared/datasync/} {/shared/em/} {/shared/GeoIP/} {/shared/images/} {/shared/lib/} {/shared/lib64/} {/shared/log/} {/shared/lost+found/} {/shared/mgmt/} {/shared/nfb/} {/shared/ssh/} {/shared/statsd/} {/shared/tmstat/} {/shared/vadc/} {/config/aaa/} {/config/big3d/} {/config/bigip/} {/config/filestore/} {/config/gtm/} {/config/httpd/} {/config/ntp.conf} {/config/rndc.key} {/config/ssh/} {/config/ssl/}',
      fileBlacklistReadOnlyPathPrefix: '{/etc/shadow}',
      fileLocalPathPrefix: '{/shared/} {/tmp/}',
      fileWhitelistPathPrefix:
        '{/var/local/scf} {/tmp/} {/shared/} {/config/} {/usr/share/aws/}',
      guiSecurityBanner: 'enabled',
      guiSecurityBannerText:
        'Welcome to the BIG-IP Configuration Utility.\n\nLog in with your username and password using the fields on the left.',
      guiSetup: 'disabled',
      hostAddrMode: 'management',
      hostname: ExpectedData.bigipMgmt.hostname,
      kind: 'tm:sys:global-settings:global-settingsstate',
      lcdDisplay: 'enabled',
      ledLocator: 'disabled',
      mgmtDhcp: 'enabled',
      netReboot: 'disabled',
      passwordPrompt: 'Password',
      quietBoot: 'enabled',
      selfLink: 'https://localhost/mgmt/tm/sys/global-settings?ver=13.1.1',
      usernamePrompt: 'Username',
    };
  },

  bigipNetVlans200: () => {
    return {
      kind: 'tm:net:vlan:vlancollectionstate',
      selfLink: 'https://localhost/mgmt/tm/net/vlan?ver=13.1.1',
      items: [
        {
          kind: 'tm:net:vlan:vlanstate',
          name: 'vlan-external2',
          partition: 'Common',
          fullPath: '/Common/vlan-external2',
          generation: 375,
          selfLink:
            'https://localhost/mgmt/tm/net/vlan/~Common~vlan-external2?ver=13.1.1',
          autoLasthop: 'default',
          cmpHash: 'default',
          dagRoundRobin: 'disabled',
          dagTunnel: 'outer',
          failsafe: 'disabled',
          failsafeAction: 'failover-restart-tm',
          failsafeTimeout: 90,
          fwdMode: 'l3',
          hardwareSyncookie: 'disabled',
          ifIndex: 176,
          learning: 'enable-forward',
          mtu: 1500,
          sflow: {
            pollInterval: 0,
            pollIntervalGlobal: 'yes',
            samplingRate: 0,
            samplingRateGlobal: 'yes',
          },
          sourceChecking: 'disabled',
          synFloodRateLimit: 1000,
          syncacheThreshold: 6000,
          tag: 4092,
          interfacesReference: {
            link:
              'https://localhost/mgmt/tm/net/vlan/~Common~vlan-external2/interfaces?ver=13.1.1',
            isSubcollection: true,
          },
        },
        {
          kind: 'tm:net:vlan:vlanstate',
          name: 'vlan-failover1',
          partition: 'Common',
          fullPath: '/Common/vlan-failover1',
          generation: 357,
          selfLink:
            'https://localhost/mgmt/tm/net/vlan/~Common~vlan-failover1?ver=13.1.1',
          autoLasthop: 'default',
          cmpHash: 'default',
          dagRoundRobin: 'disabled',
          dagTunnel: 'outer',
          failsafe: 'disabled',
          failsafeAction: 'failover-restart-tm',
          failsafeTimeout: 90,
          fwdMode: 'l3',
          hardwareSyncookie: 'disabled',
          ifIndex: 144,
          learning: 'enable-forward',
          mtu: 1500,
          sflow: {
            pollInterval: 0,
            pollIntervalGlobal: 'yes',
            samplingRate: 0,
            samplingRateGlobal: 'yes',
          },
          sourceChecking: 'disabled',
          synFloodRateLimit: 1000,
          syncacheThreshold: 6000,
          tag: 4094,
          interfacesReference: {
            link:
              'https://localhost/mgmt/tm/net/vlan/~Common~vlan-failover1/interfaces?ver=13.1.1',
            isSubcollection: true,
          },
        },
        {
          kind: 'tm:net:vlan:vlanstate',
          name: 'vlan-internal1',
          partition: 'Common',
          fullPath: '/Common/vlan-internal1',
          generation: 366,
          selfLink:
            'https://localhost/mgmt/tm/net/vlan/~Common~vlan-internal1?ver=13.1.1',
          autoLasthop: 'default',
          cmpHash: 'default',
          dagRoundRobin: 'disabled',
          dagTunnel: 'outer',
          failsafe: 'disabled',
          failsafeAction: 'failover-restart-tm',
          failsafeTimeout: 90,
          fwdMode: 'l3',
          hardwareSyncookie: 'disabled',
          ifIndex: 160,
          learning: 'enable-forward',
          mtu: 1500,
          sflow: {
            pollInterval: 0,
            pollIntervalGlobal: 'yes',
            samplingRate: 0,
            samplingRateGlobal: 'yes',
          },
          sourceChecking: 'disabled',
          synFloodRateLimit: 1000,
          syncacheThreshold: 6000,
          tag: 4093,
          interfacesReference: {
            link:
              'https://localhost/mgmt/tm/net/vlan/~Common~vlan-internal1/interfaces?ver=13.1.1',
            isSubcollection: true,
          },
        },
      ],
    };
  },
  bigipnetSelfips200: () => {
    return {
      kind: 'tm:net:self:selfcollectionstate',
      selfLink: 'https://localhost/mgmt/tm/net/self?ver=13.1.1',
      items: [
        {
          kind: 'tm:net:self:selfstate',
          name: 'selfip-external2',
          partition: 'Common',
          fullPath: '/Common/selfip-external2',
          generation: 398,
          selfLink:
            'https://localhost/mgmt/tm/net/self/~Common~selfip-external2?ver=13.1.1',
          address: '10.250.41.5/24',
          addressSource: 'from-user',
          floating: 'disabled',
          inheritedTrafficGroup: 'false',
          trafficGroup: '/Common/traffic-group-local-only',
          trafficGroupReference: {
            link:
              'https://localhost/mgmt/tm/cm/traffic-group/~Common~traffic-group-local-only?ver=13.1.1',
          },
          unit: 0,
          vlan: '/Common/vlan-external2',
          vlanReference: {
            link:
              'https://localhost/mgmt/tm/net/vlan/~Common~vlan-external2?ver=13.1.1',
          },
          allowService: ['default'],
        },
        {
          kind: 'tm:net:self:selfstate',
          name: 'selfip-internal1',
          partition: 'Common',
          fullPath: '/Common/selfip-internal1',
          generation: 397,
          selfLink:
            'https://localhost/mgmt/tm/net/self/~Common~selfip-internal1?ver=13.1.1',
          address: '10.250.42.4/24',
          addressSource: 'from-user',
          floating: 'disabled',
          inheritedTrafficGroup: 'false',
          trafficGroup: '/Common/traffic-group-local-only',
          trafficGroupReference: {
            link:
              'https://localhost/mgmt/tm/cm/traffic-group/~Common~traffic-group-local-only?ver=13.1.1',
          },
          unit: 0,
          vlan: '/Common/vlan-internal1',
          vlanReference: {
            link:
              'https://localhost/mgmt/tm/net/vlan/~Common~vlan-internal1?ver=13.1.1',
          },
          allowService: ['default'],
        },
        {
          kind: 'tm:net:self:selfstate',
          name: 'selfip-failover1',
          partition: 'Common',
          fullPath: '/Common/selfip-failover1',
          generation: 396,
          selfLink:
            'https://localhost/mgmt/tm/net/self/~Common~selfip-failover1?ver=13.1.1',
          address: '10.250.50.5/24',
          addressSource: 'from-user',
          floating: 'disabled',
          inheritedTrafficGroup: 'false',
          trafficGroup: '/Common/traffic-group-local-only',
          trafficGroupReference: {
            link:
              'https://localhost/mgmt/tm/cm/traffic-group/~Common~traffic-group-local-only?ver=13.1.1',
          },
          unit: 0,
          vlan: '/Common/vlan-failover1',
          vlanReference: {
            link:
              'https://localhost/mgmt/tm/net/vlan/~Common~vlan-failover1?ver=13.1.1',
          },
          allowService: ['default'],
        },
      ],
    };
  },

  bigipNetInterfaces200: () => {
    return {
      items: [
        {
          bundle: 'not-supported',
          bundleSpeed: 'not-supported',
          enabled: true,
          flowControl: 'tx-rx',
          forceGigabitFiber: 'disabled',
          forwardErrorCorrection: 'not-supported',
          fullPath: '1.1',
          generation: 29,
          ifIndex: 48,
          kind: 'tm:net:interface:interfacestate',
          lldpAdmin: 'txonly',
          lldpTlvmap: 130943,
          macAddress: 'fa:16:3e:fd:0f:ce',
          mediaActive: 'none',
          mediaFixed: '10000T-FD',
          mediaMax: 'auto',
          mediaSfp: 'auto',
          mtu: 9198,
          name: '1.1',
          portFwdMode: 'l3',
          preferPort: 'sfp',
          qinqEthertype: '0x8100',
          selfLink: 'https://localhost/mgmt/tm/net/interface/1.1?ver=13.1.1',
          sflow: {
            pollInterval: 0,
            pollIntervalGlobal: 'yes',
          },
          stp: 'enabled',
          stpAutoEdgePort: 'enabled',
          stpEdgePort: 'true',
          stpLinkType: 'auto',
        },
        {
          bundle: 'not-supported',
          bundleSpeed: 'not-supported',
          enabled: true,
          flowControl: 'tx-rx',
          forceGigabitFiber: 'disabled',
          forwardErrorCorrection: 'not-supported',
          fullPath: '1.2',
          generation: 24,
          ifIndex: 64,
          kind: 'tm:net:interface:interfacestate',
          lldpAdmin: 'txonly',
          lldpTlvmap: 130943,
          macAddress: 'fa:16:3e:f3:1a:b2',
          mediaActive: 'none',
          mediaFixed: '10000T-FD',
          mediaMax: 'auto',
          mediaSfp: 'auto',
          mtu: 9198,
          name: '1.2',
          portFwdMode: 'l3',
          preferPort: 'sfp',
          qinqEthertype: '0x8100',
          selfLink: 'https://localhost/mgmt/tm/net/interface/1.2?ver=13.1.1',
          sflow: {
            pollInterval: 0,
            pollIntervalGlobal: 'yes',
          },
          stp: 'enabled',
          stpAutoEdgePort: 'enabled',
          stpEdgePort: 'true',
          stpLinkType: 'auto',
        },
        {
          bundle: 'not-supported',
          bundleSpeed: 'not-supported',
          enabled: true,
          flowControl: 'tx-rx',
          forceGigabitFiber: 'disabled',
          forwardErrorCorrection: 'not-supported',
          fullPath: '1.3',
          generation: 20,
          ifIndex: 80,
          kind: 'tm:net:interface:interfacestate',
          lldpAdmin: 'txonly',
          lldpTlvmap: 130943,
          macAddress: 'fa:16:3e:35:da:15',
          mediaActive: 'none',
          mediaFixed: '10000T-FD',
          mediaMax: 'auto',
          mediaSfp: 'auto',
          mtu: 9198,
          name: '1.3',
          portFwdMode: 'l3',
          preferPort: 'sfp',
          qinqEthertype: '0x8100',
          selfLink: 'https://localhost/mgmt/tm/net/interface/1.3?ver=13.1.1',
          sflow: {
            pollInterval: 0,
            pollIntervalGlobal: 'yes',
          },
          stp: 'enabled',
          stpAutoEdgePort: 'enabled',
          stpEdgePort: 'true',
          stpLinkType: 'auto',
        },
        {
          bundle: 'not-supported',
          bundleSpeed: 'not-supported',
          enabled: true,
          flowControl: 'tx-rx',
          forceGigabitFiber: 'disabled',
          forwardErrorCorrection: 'not-supported',
          fullPath: 'mgmt',
          generation: 202,
          ifIndex: 32,
          kind: 'tm:net:interface:interfacestate',
          lldpAdmin: 'txonly',
          lldpTlvmap: 130943,
          macAddress: 'fa:16:3e:94:60:40',
          mediaActive: '100TX-FD',
          mediaFixed: 'auto',
          mediaSfp: 'auto',
          mtu: 1500,
          name: 'mgmt',
          portFwdMode: 'l3',
          preferPort: 'sfp',
          qinqEthertype: '0x8100',
          selfLink: 'https://localhost/mgmt/tm/net/interface/mgmt?ver=13.1.1',
          sflow: {
            pollInterval: 0,
            pollIntervalGlobal: 'yes',
          },
          stp: 'enabled',
          stpAutoEdgePort: 'enabled',
          stpEdgePort: 'true',
          stpLinkType: 'auto',
        },
      ],
      kind: 'tm:net:interface:interfacecollectionstate',
      selfLink: 'https://localhost/mgmt/tm/net/interface?ver=13.1.1',
    };
  },

  bigipMgmtSys200: () => {
    return {
      items: [
        {
          reference: {
            link: 'https://localhost/mgmt/tm/sys/application?ver=13.1.1',
          },
        },
        //...
        {
          reference: {
            link: 'https://localhost/mgmt/tm/sys/ucs?ver=13.1.1',
          },
        },
      ],
      kind: 'tm:sys:syscollectionstate',
      selfLink: 'https://localhost/mgmt/tm/sys?ver=13.1.1',
    };
  },

  // not used.
  bigipMgmtSysTimeout: async () => {
    //await new Promise(resolve => setTimeout(resolve, 20 * 1000));
    //return {};
    throw new HttpErrors.RequestTimeout('timeout');
  },

  onboardingProxyError502: () => {
    return new HttpErrors.BadGateway(`
    <!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html>
    <head>
        <title>502 Proxy Error</title>
    </head>
    <body>
        <h1>Proxy Error</h1>
        <p>The proxy server received an invalid
response from an upstream server.
            <br />
The proxy server could not handle the request
            <em>
                <a href="/mgmt/shared/declarative-onboarding">POST&nbsp;/mgmt/shared/declarative-onboarding</a>
            </em>.
            <p>
Reason:
                <strong>Error reading from remote server</strong>
            </p>
        </p>
    </body>
</html>
`);
  },

  onboardingServerError500: () => {
    return {
      code: 500,
      status: 'ERROR',
      message: 'invalid config - rolled back',
      errors: [
        "No offerings found for regkey pool license 'mykeypool-all' and the given search criteria (none)",
      ],
      declaration: {
        schemaVersion: '1.3.0',
        class: 'Device',
        label: 'Basic onboarding',
        async: false,
        Common: {
          class: 'Tenant',
          hostname: ExpectedData.bigipMgmt.hostname,
          myLicense: {
            class: 'License',
            licenseType: 'licensePool',
            bigIqHost: '10.250.15.119',
            bigIqUsername: 'admin',
            licensePool: 'mykeypool-all',
            reachable: true,
            bigIpUsername: 'admin',
            unitOfMeasure: 'monthly',
            overwrite: false,
          },
        },
      },
    };
  },

  onboardingSucceed202: () => {
    return {
      id: ExpectedData.doTaskId,
      selfLink: `https://localhost/mgmt/shared/declarative-onboarding/task/${ExpectedData.doTaskId}`,
      result: {
        class: 'Result',
        code: 202,
        status: 'RUNNING',
        message: 'processing',
      },
      declaration: {
        schemaVersion: '1.3.0',
        class: 'Device',
        async: true,
        label: 'Basic onboarding',
        Common: {
          class: 'Tenant',
          hostname: 'f250c956-bdd7-41cd-b3d5-03a79c7d90f8.f5bigip.local',
          myLicense: {
            class: 'License',
            licenseType: 'licensePool',
            bigIqHost: '10.250.15.105',
            bigIqUsername: 'admin',
            licensePool: 'mykeypool',
            reachable: true,
            bigIpUsername: 'admin',
            unitOfMeasure: 'monthly',
            overwrite: false,
          },
          myProvision: {
            class: 'Provision',
            ltm: 'nominal',
            asm: 'nominal',
          },
          myDns: {
            class: 'DNS',
            nameServers: ['8.8.8.8'],
            search: ['openstack.local'],
          },
          myNtp: {
            class: 'NTP',
            servers: ['0.pool.ntp.org', '1.pool.ntp.org', '2.pool.ntp.org'],
            timezone: 'UTC',
          },
          'vlan-failover1': {
            class: 'VLAN',
            interfaces: [
              {
                name: '1.1',
                tagged: false,
              },
            ],
          },
          'vlan-internal1': {
            class: 'VLAN',
            interfaces: [
              {
                name: '1.2',
                tagged: false,
              },
            ],
          },
          'vlan-external2': {
            class: 'VLAN',
            interfaces: [
              {
                name: '1.3',
                tagged: false,
              },
            ],
          },
          'selfip-failover1': {
            class: 'SelfIp',
            vlan: 'vlan-failover1',
            address: '10.250.50.6/24',
            trafficGroup: 'traffic-group-local-only',
            allowService: 'default',
          },
          'selfip-internal1': {
            class: 'SelfIp',
            vlan: 'vlan-internal1',
            address: '10.250.42.9/24',
            trafficGroup: 'traffic-group-local-only',
            allowService: 'default',
          },
          'selfip-external2': {
            class: 'SelfIp',
            vlan: 'vlan-external2',
            address: '10.250.41.13/24',
            trafficGroup: 'traffic-group-local-only',
            allowService: 'default',
          },
          'route-external2': {
            class: 'Route',
            gw: '10.250.41.1',
            network: 'default',
          },
          configsync: {
            class: 'ConfigSync',
            configsyncIp: '10.250.50.6',
          },
        },
      },
    };
  },

  onboardingSucceed200: () => {
    return {
      id: ExpectedData.doTaskId,
      selfLink: `https://localhost/mgmt/shared/declarative-onboarding/task/${ExpectedData.doTaskId}`,
      result: {
        class: 'Result',
        code: 200,
        status: 'OK',
        message: 'success',
      },
      declaration: {
        schemaVersion: '1.3.0',
        class: 'Device',
        async: true,
        label: 'Basic onboarding',
        Common: {
          class: 'Tenant',
          hostname: 'f250c956-bdd7-41cd-b3d5-03a79c7d90f8.f5bigip.local',
          myLicense: {
            class: 'License',
            licenseType: 'licensePool',
            bigIqHost: '10.250.15.105',
            bigIqUsername: 'admin',
            licensePool: 'mykeypool',
            reachable: true,
            bigIpUsername: 'admin',
            unitOfMeasure: 'monthly',
            overwrite: false,
          },
          myProvision: {
            class: 'Provision',
            ltm: 'nominal',
            asm: 'nominal',
          },
          myDns: {
            class: 'DNS',
            nameServers: ['8.8.8.8'],
            search: ['openstack.local'],
          },
          myNtp: {
            class: 'NTP',
            servers: ['0.pool.ntp.org', '1.pool.ntp.org', '2.pool.ntp.org'],
            timezone: 'UTC',
          },
          'vlan-failover1': {
            class: 'VLAN',
            interfaces: [
              {
                name: '1.1',
                tagged: false,
              },
            ],
          },
          'vlan-internal1': {
            class: 'VLAN',
            interfaces: [
              {
                name: '1.2',
                tagged: false,
              },
            ],
          },
          'vlan-external2': {
            class: 'VLAN',
            interfaces: [
              {
                name: '1.3',
                tagged: false,
              },
            ],
          },
          'selfip-failover1': {
            class: 'SelfIp',
            vlan: 'vlan-failover1',
            address: '10.250.50.6/24',
            trafficGroup: 'traffic-group-local-only',
            allowService: 'default',
          },
          'selfip-internal1': {
            class: 'SelfIp',
            vlan: 'vlan-internal1',
            address: '10.250.42.9/24',
            trafficGroup: 'traffic-group-local-only',
            allowService: 'default',
          },
          'selfip-external2': {
            class: 'SelfIp',
            vlan: 'vlan-external2',
            address: '10.250.41.13/24',
            trafficGroup: 'traffic-group-local-only',
            allowService: 'default',
          },
          'route-external2': {
            class: 'Route',
            gw: '10.250.41.1',
            network: 'default',
          },
          configsync: {
            class: 'ConfigSync',
            configsyncIp: '10.250.50.6',
          },
        },
      },
    };
  },

  trustProxyDeploy200: () => {
    return {
      results: [
        {
          message: 'success',
          lineCount: 26,
          code: 200,
          host: 'localhost',
          tenant: 'F5_62a18d5f73c0447985f47cd034256ff5',
          runTime: 1199,
        },
      ],
      declaration: {
        F5_62a18d5f73c0447985f47cd034256ff5: {
          class: 'Tenant',
          label: '62a18d5f73c0447985f47cd034256ff5',
          F5_3cc12f17_a6c7_4884_a119_98b456fe2020: {
            class: 'Application',
            label: '3cc12f17-a6c7-4884-a119-98b456fe2020',
            template: 'generic',
            F5_9601765a_e585_4355_bbd0_b60301d3bbdc: {
              class: 'Service_HTTP',
              label: '9601765a-e585-4355-bbd0-b60301d3bbdc',
              pool: 'F5_7f8aea96_7389_4660_94f8_a68caab4f670',
              virtualAddresses: ['10.250.41.17'],
              virtualPort: 80,
            },
            F5_7f8aea96_7389_4660_94f8_a68caab4f670: {
              class: 'Pool',
              label: '7f8aea96-7389-4660-94f8-a68caab4f670',
              loadBalancingMode: 'round-robin',
              members: [
                {
                  servicePort: 80,
                  serverAddresses: ['10.250.42.46'],
                  monitors: [
                    {
                      use: 'F5_2b70cc27_6fd8_41e7_8e97_0355cc77067b',
                    },
                  ],
                },
              ],
              monitors: [
                {
                  use: 'F5_895cc33f_7af6_4477_adc4_c286908f0e72',
                },
              ],
            },
            F5_895cc33f_7af6_4477_adc4_c286908f0e72: {
              class: 'Monitor',
              label: '895cc33f-7af6-4477-adc4-c286908f0e72',
              monitorType: 'icmp',
            },
            F5_2b70cc27_6fd8_41e7_8e97_0355cc77067b: {
              class: 'Monitor',
              label: '2b70cc27-6fd8-41e7-8e97-0355cc77067b',
              monitorType: 'icmp',
            },
          },
        },
        class: 'ADC',
        schemaVersion: '3.0.0',
        id: 'b9942494-1106-46da-bfe8-e2c47154904c',
        updateMode: 'selective',
        controls: {
          archiveTimestamp: '2019-05-30T07:35:13.004Z',
        },
      },
    };
  },

  trustProxyDeploy422: () => {
    let err = new HttpErrors.UnprocessableEntity();
    err.message = 'declaration is invalid';
    err.referer = 'http://localhost:8105/shared/TrustedProxy';
    err.originalRequestBody =
      '{"method":"Post","uri":"https://10.250.15.146:443/mgmt/shared/appsvcs/declare","body":{"class":"ADC","schemaVersion":"3.0.0","id":"b9942494-1106-46da-bfe8-e2c47154904c","F5_62a18d5f73c0447985f47cd034256ff5":{"class":"Tenant","label":"62a18d5f73c0447985f47cd034256ff5","F5_3cc12f17_a6c7_4884_a119_98b456fe2020":{"class":"Application","label":"3cc12f17-a6c7-4884-a119-98b456fe2020","template":"generic","F5_9601765a_e585_4355_bbd0_b60301d3bbdc":{"class":"Service_HTTP","label":"9601765a-e585-4355-bbd0-b60301d3bbdc","pool":"F5_7f8aea96_7389_4660_94f8_a68caab4f670","virtualAddresses":["10.250.41.17"],"virtualPort":80},"F5_7f8aea96_7389_4660_94f8_a68caab4f670":{"class":"Pool","label":"7f8aea96-7389-4660-94f8-a68caab4f670","loadBalancingMode":"round-robin","members":[{"servicePort":80,"serverAddresses":["10.250.42.46"],"monitors":[{"use":"F5_2b70cc27_6sdsfd8_41e7_8e97_0355cc77067b"}]}],"monitors":[{"use":"F5_895cc33f_7af6_4477_adc4_c286908f0e72"}]},"F5_895cc33f_7af6_4477_adc4_c286908f0e72":{"class":"Monitor","label":"895cc33f-7af6-4477-adc4-c286908f0e72","monitorType":"icmp"},"F5_2b70cc27_6fd8_41e7_8e97_0355cc77067b":{"class":"Monitor","label":"2b70cc27-6fd8-41e7-8e97-0355cc77067b","monitorType":"icmp"}}}}}';
    throw err;
  },
};
