const SUPPORTED_METHODS = ["initialize", "tools/list", "tools/call"] as const;

export const parseErrorMessage =
  'Parse error: expected a JSON-RPC 2.0 request object. Send JSON such as { "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {} }.';

export const invalidRequestMessage =
  'Invalid Request: expected { jsonrpc: "2.0", id?: string | number | null, method: string, params?: object }. Use method "initialize", then "tools/list", then "tools/call".';

export const postOnlyMessage =
  "Use POST for MCP requests. Send JSON-RPC 2.0 to /mcp or /mcp/v4 with methods initialize, tools/list, or tools/call.";

export const methodNotFoundMessage = (method: string): string => {
  return `Method not found: ${method}. Supported MCP methods are: ${SUPPORTED_METHODS.join(
    ", "
  )}.`;
};
