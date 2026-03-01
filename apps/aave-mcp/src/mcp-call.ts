import {
  createAaveExecuteExecutor,
  createAaveSearchExecutor,
  truncateResponse,
} from "./codemode";
import type { Env, ToolCallParams } from "./types";

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

const getCodeArgument = (
  args: Record<string, unknown> | undefined
): string | null => {
  return typeof args?.code === "string" ? args.code : null;
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
            text: "Aave MCP codemode endpoint is healthy.",
          },
        ],
      },
    };
  }

  if (
    parsed.name !== "search_aave_schema" &&
    parsed.name !== "execute_aave_graphql"
  ) {
    return {
      error: `Unknown tool: ${parsed.name}`,
      code: -32_601,
    };
  }

  const code = getCodeArgument(parsed.arguments);
  if (!code) {
    return {
      error: "Missing required code argument",
      code: -32_602,
    };
  }

  const runner =
    parsed.name === "search_aave_schema"
      ? createAaveSearchExecutor(env)
      : createAaveExecuteExecutor(env);

  try {
    const result = await runner(code);
    return {
      result: {
        content: [{ type: "text", text: truncateResponse(result) }],
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: message,
      code: -32_603,
    };
  }
};
