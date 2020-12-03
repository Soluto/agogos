import { promises as fs } from 'fs';
import * as globby from 'globby';
import { ResourceMetadataInput, SchemaInput } from '../client';

interface SchemaFilesInput {
  metadata: ResourceMetadataInput;
  schemaFiles: string[];
}

export default async function ({ metadata, schemaFiles }: SchemaFilesInput): Promise<SchemaInput> {
  const files = await globby(schemaFiles);
  const fileContents = await Promise.all(files.map(f => fs.readFile(f, { encoding: 'utf8' })));
  const schema = fileContents.join('\n\n');
  return {
    metadata,
    schema,
  };
}
