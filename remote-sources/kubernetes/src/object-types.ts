export type GqlSchemaConfig = {
    definition: string,
};

export type GqlEndpointConfig = {
    host: string,
    headers: {
        name: string,
        value: string,
    }[],
    auth: {
        type: string,
        authority: string,
        scope: string,
    }
};


export type GqlAuthProviderConfig = {
    type: string,
    authority: string,
    clientId: string,
    clientSecret: string | {
        valueFrom: {
            secretKeyRef: {
                secretName: string,
                key: string,
            }
        }
    },
};

export type AgogosObjectConfig = GqlSchemaConfig | GqlEndpointConfig | GqlAuthProviderConfig;