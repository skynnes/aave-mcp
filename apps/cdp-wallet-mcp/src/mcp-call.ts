import type { Env, ToolCallParams } from "./types";
import { handleWalletToolCall } from "./wallet-tools";

const parseToolCallParams = (params: unknown): ToolCallParams | null => {
  if (typeof params !== "object" || params === null) {
    return null;
  }

  const candidate = params as {
    name?: unknown;
    arguments?: unknown;
  };

  if (typeof candidate.name !== "string") {
    return null;
  }

  if (
    candidate.arguments !== undefined &&
    (typeof candidate.arguments !== "object" || candidate.arguments === null)
  ) {
    return null;
  }

  return {
    name: candidate.name,
    arguments: candidate.arguments as Record<string, unknown> | undefined,
  };
};

export const handleMcpCall = async (
  params: unknown,
  env: Env
): Promise<unknown> => {
  const parsed = parseToolCallParams(params);
  if (!parsed) {
    return {
      error: "Invalid tools/call params",
      code: -32_602,
    };
  }

  if (parsed.name === "public_healthcheck") {
    return {
      result: {
        content: [
          {
            type: "text",
            text: "Wallet MCP endpoint is healthy.",
          },
        ],
      },
    };
  }

  const walletToolResponse = await handleWalletToolCall(parsed, env);
  if (walletToolResponse) {
    return walletToolResponse;
  }

  return {
    error: `Unknown tool: ${parsed.name}`,
    code: -32_601,
  };
};
