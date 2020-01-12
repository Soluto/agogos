import {SchemaDirectiveVisitor, makeRemoteExecutableSchema, delegateToSchema, introspectSchema} from 'graphql-tools';
import {GraphQLField} from 'graphql';
import {gql} from 'apollo-server-core';
import {HttpLink} from 'apollo-link-http';
import fetch from 'node-fetch';
import {injectParametersToObject} from '../param-injection';

export class GqlDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
        const {url, fieldName, arguments: gqlArgs} = this.args;
        const link = new HttpLink({uri: url, fetch: fetch as any});
        const remoteSchema = introspectSchema(link).then(schema => makeRemoteExecutableSchema({schema, link}));

        field.resolve = async (parent, args, context, info) => {
            return await delegateToSchema({
                schema: await remoteSchema, // TODO: Take this "await" outside of the hot path somehow
                operation: 'query',
                fieldName,
                args: injectParametersToObject(gqlArgs, parent, args, context),
                context,
                info,
            });
        };
    }
}

export const sdl = gql`
    directive @gql(url: String!, fieldName: String!, arguments: JSONObject) on FIELD_DEFINITION
`;
