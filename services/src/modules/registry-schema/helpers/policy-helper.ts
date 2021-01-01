import { parseType, isNonNullType } from 'graphql';
import { PolicyInput } from '..';
import logger from '../../logger';
import { PolicyArgDefinition } from '../../resource-repository';

export default function (policies?: PolicyInput[]) {
  policies?.forEach(p => {
    if (!p.args) return;

    Object.entries(p.args).forEach(([argName, argDef]: [string, PolicyArgDefinition]) => {
      try {
        const type = parseType(argDef.type);
        argDef.optional = isNonNullType(type);
      } catch (err) {
        logger.warn({ policy: p.metadata, argName, argDef, err }, 'Invalid policy argument');
        throw err;
      }
    });
  });
}
