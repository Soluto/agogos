import * as _ from 'lodash';
import { PolicyType, ResourceGroup } from '../resource-repository';
import { plugins, transformResourceGroup } from './apply-plugins';
import { StitchPlugin } from './types';

const resourceGroup: ResourceGroup = {
  schemas: [
    {
      metadata: {
        namespace: 'ns',
        name: 'old-name',
      },
      schema: `
              type Query {
                foo: String!
              }
            `,
    },
  ],
  upstreams: [],
  upstreamClientCredentials: [],
  policies: [],
};
const loadedPlugins: StitchPlugin[] = [
  {
    name: 'rename-name',
    transformResourceGroup(rg: ResourceGroup) {
      return _.set(rg, 'schemas[0].metadata.name', 'new-name');
    },
  },
  {
    name: 'rename-namespace',
    transformResourceGroup(rg: ResourceGroup) {
      return _.set(rg, 'schemas[0].metadata.namespace', 'new-ns');
    },
  },
  {
    name: 'do-nothing',
  },
  {
    name: 'transform-resource-group',
    transformResourceGroup(resourceGroup: ResourceGroup) {
      return {
        ...resourceGroup,
        policies: [
          {
            metadata: {
              namespace: 'ns',
              name: 'policy',
            },
            type: PolicyType.opa,
            code: 'REGO code',
          },
        ],
      };
    },
  },
];

const loadedPluginsWithCrash: StitchPlugin[] = [
  {
    name: 'do-nothing',
  },
  {
    name: 'throw error',
    transformResourceGroup() {
      throw new Error('Something bad happened');
    },
  },
];

describe('Plugins: transformResourceGroup', () => {
  test('transformResourceGroup', async () => {
    plugins.splice(0, plugins.length);
    plugins.push(...loadedPlugins);
    const result = await transformResourceGroup(resourceGroup);
    expect(result).toMatchSnapshot();
  });

  test('transformResourceGroup crashing', async () => {
    plugins.splice(0, plugins.length);
    plugins.push(...loadedPluginsWithCrash);
    const result = await transformResourceGroup(resourceGroup).catch(e => e);
    expect(result).toMatchSnapshot();
  });
});
