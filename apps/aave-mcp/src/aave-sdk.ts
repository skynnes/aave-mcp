import { AaveClient } from "@aave/client";
import {
  activities,
  asset,
  assetBorrowHistory,
  assetPriceHistory,
  assetSupplyHistory,
  borrow,
  borrowApyHistory,
  borrowSwapQuote,
  cancelSwap,
  chain,
  chains,
  claimRewards,
  exchangeRate,
  hasProcessedKnownTransaction,
  hub,
  hubAssetInterestRateModel,
  hubAssets,
  hubSpokeConfigs,
  hubSummaryHistory,
  hubs,
  liquidatePosition,
  preparePositionSwap,
  prepareSwapCancel,
  prepareTokenSwap,
  preview,
  protocolHistory,
  renounceSpokeUserPositionManager,
  repay,
  repayWithSupplyQuote,
  reserve,
  reserveHolders,
  reserves,
  setSpokeUserPositionManager,
  setUserSuppliesAsCollateral,
  spoke,
  spokePositionManagers,
  spokeSummaryHistory,
  spokes,
  spokeUserPositionManagers,
  stableVault,
  stableVaultAssignRate,
  stableVaultClaimStatus,
  stableVaultClaimSurplus,
  stableVaultDeposit,
  stableVaultMovements,
  stableVaultRateUsers,
  stableVaults,
  stableVaultUnassignRate,
  stableVaultUserPositions,
  stableVaultWithdraw,
  stableVaultWithdrawRedeem,
  supply,
  supplyApyHistory,
  supplySwapQuote,
  swap,
  swappableTokens,
  swapStatus,
  tokenSwapQuote,
  updateUserPositionConditions,
  userBalances,
  userBorrows,
  userClaimableRewards,
  userPosition,
  userPositions,
  userRiskPremiumBreakdown,
  userSummary,
  userSummaryHistory,
  userSupplies,
  userSwaps,
  waitForStableVaultWithdrawClaim,
  waitForSwapOutcome,
  withdraw,
  withdrawSwapQuote,
} from "@aave/client/actions";
import {
  normalizeCode,
  resolveProvider,
  ToolDispatcher,
} from "@cloudflare/codemode";
import {
  AAVE_SDK_ACTION_NAMES,
  AAVE_SDK_TYPES,
  type AaveSdkActionName,
  getAaveSdkActionToolDescription,
} from "./aave-sdk-reference";
import {
  hasCatchClause,
  hasObviousNonTerminatingLoop,
  isAsyncArrowFunctionCode,
  stripTypeScriptSyntax,
} from "./code-sanitizer";
import { addAaveSdkErrorGuidance } from "./error-guidance";

interface AaveResult {
  isOk(): boolean;
  isErr(): boolean;
  value?: unknown;
  error?: unknown;
}

type AaveSdkAction = (
  client: AaveClient,
  request: unknown,
  options?: unknown
) => PromiseLike<AaveResult>;

type JsonSafe =
  | boolean
  | number
  | string
  | null
  | JsonSafe[]
  | { [key: string]: JsonSafe };

interface ExecuteResult {
  result: unknown;
  error?: string;
  logs?: string[];
}

interface StableExecutorEntrypoint {
  evaluate(dispatchers: Record<string, ToolDispatcher>): Promise<ExecuteResult>;
}

const CODEMODE_TIMEOUT_MS = 30_000;
const MAX_EXECUTE_CODE_CHARS = 20_000;
const MAX_LOG_ENTRIES = 50;
const MAX_LOG_CHARS = 1000;
const MAX_JSON_DEPTH = 12;
const MAX_JSON_ARRAY_ITEMS = 200;
const MAX_JSON_OBJECT_KEYS = 200;
const MAX_JSON_STRING_CHARS = 20_000;

const createExecutorModule = (code: string): string => {
  return [
    'import { WorkerEntrypoint } from "cloudflare:workers";',
    "",
    `const MAX_LOG_ENTRIES = ${MAX_LOG_ENTRIES};`,
    `const MAX_LOG_CHARS = ${MAX_LOG_CHARS};`,
    "",
    "export default class CodeExecutor extends WorkerEntrypoint {",
    "  async evaluate(__dispatchers = {}) {",
    "    const __logs = [];",
    "    const __pushLog = (entry) => {",
    "      if (__logs.length >= MAX_LOG_ENTRIES) {",
    "        return;",
    "      }",
    "      const text = String(entry);",
    '      __logs.push(text.length > MAX_LOG_CHARS ? text.slice(0, MAX_LOG_CHARS) + "... [truncated]" : text);',
    "    };",
    "    console.log = (...args) => {",
    '      __pushLog(args.map(String).join(" "));',
    "    };",
    "    console.warn = (...args) => {",
    '      __pushLog("[warn] " + args.map(String).join(" "));',
    "    };",
    "    console.error = (...args) => {",
    '      __pushLog("[error] " + args.map(String).join(" "));',
    "    };",
    "",
    "    const aave = new Proxy({}, {",
    "      get: (_, toolName) => async (...args) => {",
    "        const resJson = await __dispatchers.aave.call(String(toolName), JSON.stringify(args));",
    "        const data = JSON.parse(resJson);",
    "",
    "        if (data.error) {",
    "          return {",
    '            __typename: "AaveSdkActionError",',
    "            action: String(toolName),",
    "            message: data.error,",
    "            guidance: data.error,",
    "          };",
    "        }",
    "",
    "        return data.result;",
    "      },",
    "    });",
    "",
    "    try {",
    "      const result = await Promise.race([",
    `        (${code})(),`,
    "        new Promise((_, reject) =>",
    `          setTimeout(() => reject(new Error("Execution timed out")), ${CODEMODE_TIMEOUT_MS})`,
    "        ),",
    "      ]);",
    "",
    "      return { result, logs: __logs };",
    "    } catch (error) {",
    "      return {",
    "        result: undefined,",
    "        error: error instanceof Error ? error.message : String(error),",
    "        logs: __logs,",
    "      };",
    "    }",
    "  }",
    "}",
  ].join("\n");
};

const SDK_ACTIONS = {
  activities,
  asset,
  assetBorrowHistory,
  assetPriceHistory,
  assetSupplyHistory,
  borrow,
  borrowApyHistory,
  borrowSwapQuote,
  cancelSwap,
  chain,
  chains,
  claimRewards,
  exchangeRate,
  hasProcessedKnownTransaction,
  hub,
  hubAssetInterestRateModel,
  hubAssets,
  hubSpokeConfigs,
  hubSummaryHistory,
  hubs,
  liquidatePosition,
  preparePositionSwap,
  prepareSwapCancel,
  prepareTokenSwap,
  preview,
  protocolHistory,
  renounceSpokeUserPositionManager,
  repay,
  repayWithSupplyQuote,
  reserve,
  reserveHolders,
  reserves,
  setSpokeUserPositionManager,
  setUserSuppliesAsCollateral,
  spoke,
  spokePositionManagers,
  spokeSummaryHistory,
  spokeUserPositionManagers,
  spokes,
  stableVault,
  stableVaultAssignRate,
  stableVaultClaimStatus,
  stableVaultClaimSurplus,
  stableVaultDeposit,
  stableVaultMovements,
  stableVaultRateUsers,
  stableVaultUnassignRate,
  stableVaultUserPositions,
  stableVaultWithdraw,
  stableVaultWithdrawRedeem,
  stableVaults,
  supply,
  supplyApyHistory,
  supplySwapQuote,
  swap,
  swapStatus,
  swappableTokens,
  tokenSwapQuote,
  updateUserPositionConditions,
  userBalances,
  userBorrows,
  userClaimableRewards,
  userPosition,
  userPositions,
  userRiskPremiumBreakdown,
  userSummary,
  userSummaryHistory,
  userSupplies,
  userSwaps,
  waitForStableVaultWithdrawClaim,
  waitForSwapOutcome,
  withdraw,
  withdrawSwapQuote,
} as unknown as Record<AaveSdkActionName, AaveSdkAction>;

const client = AaveClient.create({
  batch: false,
  cache: false,
});

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (
    isPlainObject(error) &&
    typeof error.name === "string" &&
    typeof error.message === "string"
  ) {
    return `${error.name}: ${error.message}`;
  }

  if (isPlainObject(error) && typeof error.message === "string") {
    return error.message;
  }

  return String(error);
};

const truncateString = (value: string): string => {
  if (value.length <= MAX_JSON_STRING_CHARS) {
    return value;
  }

  return `${value.slice(0, MAX_JSON_STRING_CHARS)}... [truncated]`;
};

const toJsonSafe = (
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0
): JsonSafe => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return truncateString(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (depth >= MAX_JSON_DEPTH) {
    return "[MaxDepth]";
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);
    return value
      .slice(0, MAX_JSON_ARRAY_ITEMS)
      .map((entry) => toJsonSafe(entry, seen, depth + 1));
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);
    const entries = Object.entries(value)
      .slice(0, MAX_JSON_OBJECT_KEYS)
      .map(([key, entry]) => [key, toJsonSafe(entry, seen, depth + 1)]);

    return Object.fromEntries(entries) as { [key: string]: JsonSafe };
  }

  if (
    typeof value === "object" &&
    "toJSON" in value &&
    typeof value.toJSON === "function"
  ) {
    if (seen.has(value)) {
      return "[Circular]";
    }

    seen.add(value);
    return toJsonSafe(value.toJSON(), seen, depth + 1);
  }

  return truncateString(String(value));
};

const callSdkAction = async (
  action: AaveSdkActionName,
  request: unknown,
  options?: unknown
): Promise<JsonSafe> => {
  try {
    const result = await SDK_ACTIONS[action](client, request, options);

    if (result.isErr()) {
      const message = errorMessage(result.error);

      return toJsonSafe({
        __typename: "AaveSdkActionError",
        action,
        message,
        guidance: addAaveSdkErrorGuidance(message),
      });
    }

    return toJsonSafe(result.value);
  } catch (error) {
    const message = errorMessage(error);

    return toJsonSafe({
      __typename: "AaveSdkActionError",
      action,
      message,
      guidance: addAaveSdkErrorGuidance(message),
    });
  }
};

const sdkTools = Object.fromEntries(
  AAVE_SDK_ACTION_NAMES.map((action) => [
    action,
    {
      description: getAaveSdkActionToolDescription(action),
      execute: async (request: unknown, options?: unknown) =>
        callSdkAction(action, request, options),
    },
  ])
) as Record<
  AaveSdkActionName,
  {
    description: string;
    execute: (request: unknown, options?: unknown) => Promise<JsonSafe>;
  }
>;

const aaveProvider = resolveProvider({
  name: "aave",
  positionalArgs: true,
  tools: sdkTools,
  types: AAVE_SDK_TYPES,
});

const createAaveDispatcher = (): ToolDispatcher => {
  return new ToolDispatcher(aaveProvider.fns, aaveProvider.positionalArgs);
};

const getEphemeralExecutor = (
  loader: WorkerLoader,
  code: string
): StableExecutorEntrypoint => {
  const worker = loader.get(null, () => ({
    compatibilityDate: "2025-06-01",
    compatibilityFlags: ["nodejs_compat"],
    mainModule: "executor.js",
    modules: {
      "executor.js": createExecutorModule(code),
    },
    globalOutbound: null,
  }));

  return worker.getEntrypoint() as unknown as StableExecutorEntrypoint;
};

export const executeAaveSdkCode = async (
  env: { LOADER: WorkerLoader },
  code: string
): Promise<{ result: unknown; logs?: string[] }> => {
  if (code.length > MAX_EXECUTE_CODE_CHARS) {
    throw new Error(
      `execute_aave_sdk_code expects code under ${MAX_EXECUTE_CODE_CHARS} characters. Request narrower data or split exploratory calls into smaller snippets.`
    );
  }

  const strippedCode = stripTypeScriptSyntax(code);

  if (!isAsyncArrowFunctionCode(strippedCode)) {
    throw new Error(
      "execute_aave_sdk_code expects exactly one async arrow function and no trailing statements, for example: async () => { const chains = await aave.chains({ query: { filter: 'ALL' } }); return chains.map((chain) => ({ chainId: chain.chainId, name: chain.name })); }"
    );
  }

  if (hasCatchClause(strippedCode)) {
    throw new Error(
      "execute_aave_sdk_code does not support try/catch blocks. Let SDK action errors bubble to the MCP response so they can be returned with request-shape and account-state guidance."
    );
  }

  if (hasObviousNonTerminatingLoop(strippedCode)) {
    throw new Error(
      "execute_aave_sdk_code rejected an obvious non-terminating loop. Use bounded loops over finite arrays or rely on the 30 second timeout for asynchronous SDK calls."
    );
  }

  const executableCode = normalizeCode(strippedCode);
  const executor = getEphemeralExecutor(env.LOADER, executableCode);
  const result = await executor.evaluate({
    aave: createAaveDispatcher(),
  });

  if (result.error) {
    throw new Error(result.error);
  }

  return {
    result: result.result,
    logs: result.logs,
  };
};
