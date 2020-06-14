import {concatAST} from 'graphql';
import {SchemaDirectiveVisitor} from 'graphql-tools';
import {sdl as stubSdl, StubDirective} from './stub';
import {sdl as restSdl, RestDirective} from './rest';
import {sdl as gqlSdl, GqlDirective} from './gql';
import {sdl as exportSdl, ExportDirective} from './export';
import {sdl as selectSdl, SelectDirective} from './select';
import {sdl as policySdl, PolicyDirective} from './policy/policy';

export const directiveMap: {[visitorName: string]: typeof SchemaDirectiveVisitor} = {
    stub: StubDirective,
    rest: RestDirective,
    gql: GqlDirective,
    export: ExportDirective,
    select: SelectDirective,
    policy: PolicyDirective,
};

export const sdl = concatAST([stubSdl, restSdl, gqlSdl, exportSdl, selectSdl, policySdl]);
