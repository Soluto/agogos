import pLimit from 'p-limit';
import * as _ from 'lodash';
import { GraphQLError } from 'graphql';
import logger from '../../logger';
import { createSchemaConfig } from '../../graphql-service';
import { applyResourceGroupDeletions } from '../../resource-repository';
import { validateResourceGroupOrThrow } from '../../validation';
import { transformResourceGroup as applyPluginForResourceGroup } from '../../plugins';
import PolicyAttachmentsGenerator from '../policy-attachments-generator';
import resourceRepository from '../repository';
import { ResourceGroupMetadataInput } from '..';

const singleton = pLimit(1);

export default async function (deletions: ResourceGroupMetadataInput) {
  return singleton(async () => {
    logger.info(`Proceeding resources deletion request...`);
    const policyAttachments = new PolicyAttachmentsGenerator();

    try {
      const { resourceGroup } = await resourceRepository.fetchLatest();
      const existingPolicies = _.cloneDeep(resourceGroup.policies);

      const newRg = applyResourceGroupDeletions(resourceGroup, deletions);
      const registryRg = _.cloneDeep(newRg);

      // TODO: In case of upstream deletion we should force refresh of remote schemas
      //  updateRemoteGqlSchemas(newRg, activeDirectoryAuth);

      const gatewayRg = await applyPluginForResourceGroup(newRg);
      validateResourceGroupOrThrow(gatewayRg);
      await createSchemaConfig(gatewayRg);

      // Policy definitions generated by plugins will always be re-generated here. This is probably
      // better than reading the previous gateway resource group just for this comparison
      const policiesDiff = _.differenceWith(gatewayRg.policies, existingPolicies, _.isEqual);
      await policyAttachments.generate(policiesDiff);

      await policyAttachments.writeToRepo();
      await Promise.all([
        resourceRepository.update(registryRg, { registry: true }),
        resourceRepository.update(gatewayRg),
      ]);

      const summary = Object.fromEntries(
        Object.entries(deletions).map(([k, v]) => [k, v ? (Array.isArray(v) ? v.length : 1) : 0])
      );
      logger.info(summary, `Resources were deleted`);
    } catch (err) {
      const message = `Resources deletion request failed: ${err}`;
      logger.error({ err }, message);
      throw new GraphQLError(message);
    } finally {
      await policyAttachments.cleanup();
    }

    return { success: true };
  });
}
