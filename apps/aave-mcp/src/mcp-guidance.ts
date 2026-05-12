const TOOL_NAMES = [
  "public_healthcheck",
  "get_aave_sdk_reference",
  "get_aave_sdk_types",
  "execute_aave_sdk_code",
] as const;

const COMMON_AAVE_ACTIONS = [
  "chains",
  "spokes",
  "reserves",
  "userPositions",
  "userSummary",
  "userSupplies",
  "userBorrows",
] as const;

export const invalidToolCallParamsMessage =
  "Invalid tools/call params. Expected params shaped like { name: string, arguments?: object }. Use tools/list to inspect available Aave MCP tools.";

export const missingCodeArgumentMessage =
  "Missing required code argument. Provide arguments.code as a string containing one async arrow function, for example: async () => { const chains = await aave.chains({ query: { filter: 'ALL' } }); return chains.map((chain) => ({ chainId: chain.chainId, name: chain.name })); }";

export const unknownToolMessage = (toolName: string): string => {
  return `Unknown tool: ${toolName}. Supported tools are: ${TOOL_NAMES.join(
    ", "
  )}.`;
};

export const unknownAaveActionMessage = (action: string): string => {
  return `Unknown Aave SDK action: ${action}. Call get_aave_sdk_reference without an action to list all supported actions. Common starting actions are: ${COMMON_AAVE_ACTIONS.join(
    ", "
  )}.`;
};
