import { handleMcpCall } from "./mcp-call";
import { jsonRpcError, jsonRpcResult, parseJson } from "./rpc";
import { listTools } from "./tools";
import type { Env, JsonRpcRequest } from "./types";

const APP_NAME = "aave-mcp";
const APP_VERSION = "0.3.0";

export const handleMcp = async (
  request: Request,
  env: Env
): Promise<Response> => {
  const body = await parseJson(request);
  const rpc = body as JsonRpcRequest;

  if (typeof rpc !== "object" || rpc === null) {
    return jsonRpcError(null, -32_700, "Parse error");
  }

  const id = rpc.id ?? null;
  if (rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string") {
    return jsonRpcError(id, -32_600, "Invalid Request");
  }

  if (rpc.method === "notifications/initialized") {
    return new Response(null, { status: 204 });
  }

  if (rpc.method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: "2025-06-18",
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: APP_NAME,
        version: APP_VERSION,
      },
    });
  }

  if (rpc.method === "tools/list") {
    return jsonRpcResult(id, {
      tools: listTools(),
    });
  }

  if (rpc.method === "tools/call") {
    const call = await handleMcpCall(rpc.params, env);
    const callData = call as {
      result?: unknown;
      error?: string;
      code?: number;
    };

    if (callData.error) {
      return jsonRpcError(id, callData.code ?? -32_603, callData.error);
    }

    return jsonRpcResult(id, callData.result);
  }

  return jsonRpcError(id, -32_601, `Method not found: ${rpc.method}`);
};
