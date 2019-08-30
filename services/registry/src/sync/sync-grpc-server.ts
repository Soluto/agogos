import * as grpc from "grpc";
import { combineLatest, Observable } from "rxjs";
import { IRegistryServer, RegistryService } from "../generated/agogos_grpc_pb";
import {
    ConfigurationMessage,
    Schema,
    SubscribeParams,
    Upstream,
    UpstreamAuthCredentials,
    UpstreamAuthentication
} from "../generated/agogos_pb";

import { AgogosConfiguration } from "./object-types";
import syncSchema$ from "./sync-schemas";
import syncUpstreamAuthCredentials$ from "./sync-upstream-auth-credentials";
import syncUpstreams$ from "./sync-upstreams";
import logger from "../logger";

const PORT = process.env.GRPC_PORT || 4001;

// TODO: make this more general
const syncConfiguration$: Observable<AgogosConfiguration> = combineLatest(
    [syncSchema$, syncUpstreams$, syncUpstreamAuthCredentials$],
    (schema, upstreams, upstreamAuthCredentials) => ({
        schema,
        upstreamAuthCredentials,
        upstreams,
    })
);

class GqlConfigurationSubscriptionServer implements IRegistryServer {
    public subscribe(call: grpc.ServerWriteableStream<SubscribeParams>) {
        const subscription = syncConfiguration$.subscribe(
            (configuration: AgogosConfiguration) => {
                const gqlSchema = new Schema();
                gqlSchema.setDefinition(configuration.schema);

                // TODO: extract to function
                const upstreams: Upstream[] = Object.values(
                    configuration.upstreams
                ).map(ep => {
                    const upstream = new Upstream();
                    upstream.setHost(ep.host);

                    const upstreamAuth = new UpstreamAuthentication();
                    // FIXME: get from ep
                    upstreamAuth.setAuthType(ep.auth.authType);
                    if (ep.auth.authority) {
                        upstreamAuth.setAuthority(ep.auth.authority);
                    }

                    if (ep.auth.scope) {
                        upstreamAuth.setScope(ep.auth.scope);
                    }
                    
                    upstream.setAuth(upstreamAuth);

                    return upstream;
                });

                // TODO: extract to function
                const upstreamsAuthCredentials: UpstreamAuthCredentials[] = Object.values(
                    configuration.upstreamAuthCredentials
                ).map(ap => {
                    const upstreamAuthCredentials = new UpstreamAuthCredentials();
                    upstreamAuthCredentials.setAuthType(ap.authType);
                    upstreamAuthCredentials.setAuthority(ap.authority);
                    upstreamAuthCredentials.setClientId(ap.clientId);
                    upstreamAuthCredentials.setClientSecret(ap.clientSecret);

                    return upstreamAuthCredentials;
                });

                const configurationMessage = new ConfigurationMessage();
                configurationMessage.setSchema(gqlSchema);
                configurationMessage.setUpstreamsList(upstreams);
                configurationMessage.setUpstreamAuthCredentialsList(
                    upstreamsAuthCredentials
                );

                call.write(configurationMessage);
            },
            error => {
                logger.error({ error }, "Failed to send configuration to graphql-gateway");
            },
            () => call.end()
        );

        const endStream = () => subscription.unsubscribe();
        call.on("close", endStream);
        call.on("end", endStream);
        call.on("error", endStream);
    }
}

export function startGrpcServer() {
    const server = new grpc.Server();
    server.addService(RegistryService, new GqlConfigurationSubscriptionServer());
    server.bind(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure());
    server.start();
    logger.info(`🚀 GRPC Server ready at localhost:${PORT}`);
}
