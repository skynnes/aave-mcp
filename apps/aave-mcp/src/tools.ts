const toolDefinitions = [
  {
    name: "public_healthcheck",
    title: "Public Healthcheck",
    description: "Use this for an unauthenticated status check.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    securitySchemes: [{ type: "noauth" }],
    _meta: {
      securitySchemes: [{ type: "noauth" }],
    },
    annotations: {
      readOnlyHint: true,
    },
  },
  {
    name: "search_aave_schema",
    title: "Search Aave GraphQL Schema",
    description:
      "Run JavaScript in codemode to inspect Aave GraphQL schema via aave.listOperations(), aave.type(name), and aave.schema().",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description:
            "JavaScript async arrow function string. Example: async () => await aave.listOperations()",
        },
      },
      required: ["code"],
      additionalProperties: false,
    },
    securitySchemes: [{ type: "noauth" }],
    _meta: {
      securitySchemes: [{ type: "noauth" }],
    },
  },
  {
    name: "execute_aave_graphql",
    title: "Execute Aave GraphQL",
    description:
      "Run JavaScript in codemode and execute GraphQL operations against the configured Aave endpoint via aave.graphql(query, variables).",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description:
            "JavaScript async arrow function string. Example: async () => await aave.graphql(`{ health }`)",
        },
      },
      required: ["code"],
      additionalProperties: false,
    },
    securitySchemes: [{ type: "noauth" }],
    _meta: {
      securitySchemes: [{ type: "noauth" }],
    },
  },
] as const;

export const listTools = () => {
  return toolDefinitions;
};
