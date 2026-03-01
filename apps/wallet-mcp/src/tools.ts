import { walletToolDefinitions } from "./wallet-tools";

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
  ...walletToolDefinitions,
] as const;

export const listTools = () => {
  return toolDefinitions;
};
