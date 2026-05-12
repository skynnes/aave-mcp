import { AAVE_SDK_ACTION_NAMES } from "./aave-sdk-reference";

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
    name: "get_aave_sdk_reference",
    title: "Get Aave SDK Reference",
    description:
      "Use this before execute_aave_sdk_code. Returns supported @aave/client@v4 action names, known request-shape notes, and tested compact examples for the sandbox aave namespace.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: AAVE_SDK_ACTION_NAMES,
          description:
            "Optional @aave/client action name to fetch a focused reference for.",
        },
      },
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
    name: "get_aave_sdk_types",
    title: "Get Aave SDK Types",
    description:
      "Returns TypeScript declarations for the Aave SDK codemode sandbox. Read this when you need available actions, scalar aliases, or option types before writing execute_aave_sdk_code.",
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
    name: "execute_aave_sdk_code",
    title: "Execute Aave SDK Code",
    description:
      "Run one TypeScript async arrow function in an isolated Dynamic Worker. Call get_aave_sdk_reference first, use the provided aave namespace for @aave/client@v4 actions, and return compact JSON projections instead of full nested SDK objects.",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description:
            "TypeScript or JavaScript async arrow function string. Example: async () => { const chains = await aave.chains({ query: { filter: 'ALL' } }); return chains.map((chain) => ({ chainId: chain.chainId, name: chain.name })); }",
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
