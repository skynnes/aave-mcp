import { executeAaveSdkCode } from "./aave-sdk";
import {
  AAVE_SDK_TYPES,
  getAaveSdkReference,
  isAaveSdkActionName,
} from "./aave-sdk-reference";
import { addAaveSdkErrorGuidance } from "./error-guidance";
import {
  invalidToolCallParamsMessage,
  missingCodeArgumentMessage,
  unknownAaveActionMessage,
  unknownToolMessage,
} from "./mcp-guidance";
import { truncateResponse } from "./response-serializer";
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

const getActionArgument = (
  args: Record<string, unknown> | undefined
): string | undefined => {
  return typeof args?.action === "string" ? args.action : undefined;
};

export const handleMcpCall = async (
  params: unknown,
  env: Env
): Promise<unknown> => {
  const parsed = parseToolCallParams(params);
  if (!parsed) {
    return {
      error: invalidToolCallParamsMessage,
      code: -32_602,
    };
  }

  if (parsed.name === "public_healthcheck") {
    return {
      result: {
        content: [
          {
            type: "text",
            text: "Aave MCP SDK codemode endpoint is healthy.",
          },
        ],
      },
    };
  }

  if (parsed.name === "get_aave_sdk_reference") {
    const action = getActionArgument(parsed.arguments);
    if (action !== undefined && !isAaveSdkActionName(action)) {
      return {
        error: unknownAaveActionMessage(action),
        code: -32_602,
      };
    }

    return {
      result: {
        content: [
          { type: "text", text: truncateResponse(getAaveSdkReference(action)) },
        ],
      },
    };
  }

  if (parsed.name === "get_aave_sdk_types") {
    return {
      result: {
        content: [{ type: "text", text: AAVE_SDK_TYPES }],
      },
    };
  }

  if (parsed.name !== "execute_aave_sdk_code") {
    return {
      error: unknownToolMessage(parsed.name),
      code: -32_601,
    };
  }

  const code = getCodeArgument(parsed.arguments);
  if (!code) {
    return {
      error: missingCodeArgumentMessage,
      code: -32_602,
    };
  }

  try {
    const result = await executeAaveSdkCode(env, code);
    return {
      result: {
        content: [{ type: "text", text: truncateResponse(result) }],
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: addAaveSdkErrorGuidance(message),
      code: -32_603,
    };
  }
};
