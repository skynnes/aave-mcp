import { CdpClient } from "@coinbase/cdp-sdk";
import {
  type Address,
  createPublicClient,
  defineChain,
  http,
  isAddress,
  isHex,
  serializeTransaction,
} from "viem";
import type { Env, ToolCallParams, ToolCallResponse } from "./types";

const TOOL_GET_OR_CREATE_EVM_ACCOUNT = "wallet_get_or_create_evm_account";
const TOOL_GET_EVM_ACCOUNT = "wallet_get_evm_account";
const TOOL_REQUEST_EVM_FAUCET = "wallet_request_evm_faucet";
const TOOL_LIST_EVM_TOKEN_BALANCES = "wallet_list_evm_token_balances";
const TOOL_SIGN_EVM_TRANSACTION = "wallet_sign_evm_transaction";
const TOOL_SEND_EVM_TRANSACTION = "wallet_send_evm_transaction";
const TOOL_AAVE_FORK_TOP_UP = "wallet_aave_fork_top_up";

const FAUCET_NETWORKS = new Set(["base-sepolia", "ethereum-sepolia"]);
const FAUCET_TOKENS = new Set(["eth", "usdc", "eurc", "cbbtc"]);
const CDP_EVM_NETWORKS = new Set([
  "base",
  "base-sepolia",
  "ethereum",
  "ethereum-sepolia",
  "avalanche",
  "polygon",
  "optimism",
  "arbitrum",
]);

const toolNameSet = new Set<string>([
  TOOL_GET_OR_CREATE_EVM_ACCOUNT,
  TOOL_GET_EVM_ACCOUNT,
  TOOL_REQUEST_EVM_FAUCET,
  TOOL_LIST_EVM_TOKEN_BALANCES,
  TOOL_SIGN_EVM_TRANSACTION,
  TOOL_SEND_EVM_TRANSACTION,
  TOOL_AAVE_FORK_TOP_UP,
]);

interface ResolvedNetwork {
  requested: string;
  network: string;
  chainId?: number;
}

interface ParsedNetworkMapEntry {
  rpcUrl: string;
  chainId?: number;
}

const parseRecord = (
  value: Record<string, unknown> | undefined
): Record<string, unknown> => {
  return value ?? {};
};

const createResult = (data: unknown): ToolCallResponse => {
  return {
    result: {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    },
  };
};

const parseRequiredString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }

  return value;
};

const parseOptionalString = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Value must be a non-empty string when provided");
  }

  return value;
};

const parseOptionalHex = (
  value: unknown,
  fieldName: string
): `0x${string}` | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !isHex(value)) {
    throw new Error(`${fieldName} must be a 0x-prefixed hex string`);
  }

  return value;
};

const parseOptionalBigIntString = (
  value: unknown,
  fieldName: string
): bigint | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty base-10 string`);
  }

  try {
    return BigInt(value);
  } catch {
    throw new Error(`${fieldName} must be a valid integer string`);
  }
};

const parseOptionalNonce = (value: unknown): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error("nonce must be a non-negative integer");
  }

  return value as number;
};

const parseAddress = (value: unknown, fieldName: string): `0x${string}` => {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new Error(`${fieldName} must be a valid EVM address`);
  }

  return value;
};

const getCdpClient = (env: Env): CdpClient => {
  const apiKeyId = env.CDP_API_KEY_ID;
  const apiKeySecret = env.CDP_API_KEY_SECRET;
  const walletSecret = env.CDP_WALLET_SECRET;

  if (!(apiKeyId && apiKeySecret && walletSecret)) {
    throw new Error(
      "Missing CDP credentials. Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, and CDP_WALLET_SECRET."
    );
  }

  return new CdpClient({
    apiKeyId,
    apiKeySecret,
    walletSecret,
  });
};

const parseOptionalChainId = (
  value: unknown,
  fieldName: string
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return value as number;
};

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const shouldUseCustomRpcFlow = (network: string): boolean => {
  return isHttpUrl(network) || !CDP_EVM_NETWORKS.has(network);
};

const resolveRpcChainId = async (rpcUrl: string): Promise<number> => {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_chainId",
      params: [],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to resolve chain id from RPC URL (status ${response.status})`
    );
  }

  const payload = (await response.json()) as {
    result?: string;
    error?: { message?: string };
  };

  if (payload.error?.message) {
    throw new Error(`RPC eth_chainId error: ${payload.error.message}`);
  }

  if (typeof payload.result !== "string") {
    throw new Error("RPC eth_chainId did not return a chain id");
  }

  return Number.parseInt(payload.result, 16);
};

const sendCustomRpcTransaction = async (
  cdp: CdpClient,
  accountAddress: Address,
  rpcUrl: string,
  txRequest: {
    to: Address;
    value?: bigint;
    data?: `0x${string}`;
    nonce?: number;
    gas?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
    chainId?: number;
  },
  idempotencyKey?: string
): Promise<string> => {
  const rpcChainId = await resolveRpcChainId(rpcUrl);
  const chainId = txRequest.chainId ?? rpcChainId;

  if (chainId !== rpcChainId) {
    throw new Error(
      `Provided chainId ${chainId} does not match RPC chainId ${rpcChainId}`
    );
  }

  const chain = defineChain({
    id: chainId,
    name: `custom-${chainId}`,
    network: `custom-${chainId}`,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: { http: [rpcUrl] },
      public: { http: [rpcUrl] },
    },
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const from = accountAddress;
  const to = txRequest.to;
  const value = txRequest.value ?? 0n;
  const data = txRequest.data;

  const nonce =
    txRequest.nonce ??
    Number(
      await publicClient.getTransactionCount({
        address: from,
        blockTag: "pending",
      })
    );

  const estimatedFees = await publicClient.estimateFeesPerGas();
  const maxPriorityFeePerGas =
    txRequest.maxPriorityFeePerGas ??
    estimatedFees.maxPriorityFeePerGas ??
    1_000_000_000n;
  const maxFeePerGas =
    txRequest.maxFeePerGas ??
    estimatedFees.maxFeePerGas ??
    estimatedFees.gasPrice ??
    1_000_000_000n;

  const gas =
    txRequest.gas ??
    (await publicClient.estimateGas({
      account: from,
      to,
      value,
      data,
      nonce,
      maxFeePerGas,
      maxPriorityFeePerGas,
    }));

  const unsignedTransaction = serializeTransaction({
    chainId,
    type: "eip1559",
    to,
    value,
    data,
    nonce,
    gas,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });

  const { signature } = await cdp.evm.signTransaction({
    address: accountAddress,
    transaction: unsignedTransaction,
    idempotencyKey,
  });

  return publicClient.sendRawTransaction({
    serializedTransaction: signature,
  });
};

const parseNetworkMap = (env: Env): Record<string, ParsedNetworkMapEntry> => {
  const raw = env.WALLET_NETWORK_MAP_JSON;
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const mapped: Record<string, ParsedNetworkMapEntry> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        mapped[key] = { rpcUrl: value };
        continue;
      }

      if (typeof value === "object" && value !== null) {
        const candidate = value as {
          rpcUrl?: unknown;
          chainId?: unknown;
        };
        if (typeof candidate.rpcUrl === "string") {
          mapped[key] = {
            rpcUrl: candidate.rpcUrl,
            chainId: parseOptionalChainId(
              candidate.chainId,
              `WALLET_NETWORK_MAP_JSON.${key}.chainId`
            ),
          };
        }
      }
    }

    return mapped;
  } catch {
    throw new Error("WALLET_NETWORK_MAP_JSON must be valid JSON object");
  }
};

const resolveNetworkInput = (
  value: unknown,
  env: Env,
  chainIdInput?: unknown
): ResolvedNetwork => {
  const requested =
    parseOptionalString(value) ?? env.WALLET_DEFAULT_NETWORK ?? "base-sepolia";
  const networkMap = parseNetworkMap(env);
  const mapped = networkMap[requested];
  const resolved = mapped?.rpcUrl ?? requested;
  const mappedChainId = mapped?.chainId;
  const explicitChainId = parseOptionalChainId(chainIdInput, "chainId");
  const chainId = explicitChainId ?? mappedChainId;

  const rawAllowlist = env.WALLET_ALLOWED_NETWORKS?.trim();
  if (!rawAllowlist) {
    return {
      requested,
      network: resolved,
      chainId,
    };
  }

  const allowlist = new Set(
    rawAllowlist
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  );

  if (!(allowlist.has(requested) || allowlist.has(resolved))) {
    throw new Error(
      `network ${requested} is not allowed. Allowed networks: ${Array.from(allowlist).join(", ")}`
    );
  }

  return {
    requested,
    network: resolved,
    chainId,
  };
};

const resolveAccount = (cdp: CdpClient, args: Record<string, unknown>) => {
  const accountAddress = args.accountAddress;
  const accountName = args.accountName;

  if (accountAddress === undefined && accountName === undefined) {
    throw new Error("Provide accountAddress or accountName");
  }

  if (accountAddress !== undefined && accountName !== undefined) {
    throw new Error("Provide only one of accountAddress or accountName");
  }

  if (accountAddress !== undefined) {
    const address = parseAddress(accountAddress, "accountAddress");
    return cdp.evm.getAccount({ address });
  }

  const name = parseRequiredString(accountName, "accountName");
  return cdp.evm.getAccount({ name });
};

const handleGetOrCreateEvmAccount = async (
  args: Record<string, unknown>,
  env: Env
): Promise<ToolCallResponse> => {
  const name = parseRequiredString(args.name, "name");
  const cdp = getCdpClient(env);
  const account = await cdp.evm.getOrCreateAccount({ name });

  return createResult({
    name: account.name,
    address: account.address,
    type: account.type,
    policies: account.policies,
  });
};

const handleGetEvmAccount = async (
  args: Record<string, unknown>,
  env: Env
): Promise<ToolCallResponse> => {
  const cdp = getCdpClient(env);
  const account = await resolveAccount(cdp, args);

  return createResult({
    name: account.name,
    address: account.address,
    type: account.type,
    policies: account.policies,
  });
};

const handleRequestEvmFaucet = async (
  args: Record<string, unknown>,
  env: Env
): Promise<ToolCallResponse> => {
  const cdp = getCdpClient(env);
  const account = await resolveAccount(cdp, args);
  const { network, requested } = resolveNetworkInput(args.network, env);
  const token = (parseOptionalString(args.token) ?? "eth").toLowerCase();

  if (!FAUCET_NETWORKS.has(network)) {
    throw new Error(
      "Faucet is not available for this network. Use a supported testnet network, such as base-sepolia."
    );
  }

  if (!FAUCET_TOKENS.has(token)) {
    throw new Error(
      `Unsupported faucet token ${token}. Allowed tokens: ${Array.from(FAUCET_TOKENS).join(", ")}`
    );
  }

  const result = await cdp.evm.requestFaucet({
    address: account.address,
    network: network as Parameters<
      (typeof cdp.evm)["requestFaucet"]
    >[0]["network"],
    token: token as Parameters<(typeof cdp.evm)["requestFaucet"]>[0]["token"],
  });

  return createResult({
    address: account.address,
    requestedNetwork: requested,
    network,
    token,
    transactionHash: result.transactionHash,
  });
};

const handleListEvmTokenBalances = async (
  args: Record<string, unknown>,
  env: Env
): Promise<ToolCallResponse> => {
  const cdp = getCdpClient(env);
  const account = await resolveAccount(cdp, args);
  const { network, requested } = resolveNetworkInput(args.network, env);

  const result = await cdp.evm.listTokenBalances({
    address: account.address,
    network: network as Parameters<
      (typeof cdp.evm)["listTokenBalances"]
    >[0]["network"],
    pageSize: typeof args.pageSize === "number" ? args.pageSize : undefined,
    pageToken: parseOptionalString(args.pageToken),
  });

  return createResult({
    address: account.address,
    requestedNetwork: requested,
    network,
    balances: result.balances,
    nextPageToken: result.nextPageToken,
  });
};

const handleSignEvmTransaction = async (
  args: Record<string, unknown>,
  env: Env
): Promise<ToolCallResponse> => {
  const cdp = getCdpClient(env);
  const account = await resolveAccount(cdp, args);
  const serializedTransaction = parseOptionalHex(
    args.serializedTransaction,
    "serializedTransaction"
  );

  if (!serializedTransaction) {
    throw new Error("serializedTransaction is required");
  }

  const idempotencyKey = parseOptionalString(args.idempotencyKey);
  const { signature } = await cdp.evm.signTransaction({
    address: account.address,
    transaction: serializedTransaction,
    idempotencyKey,
  });

  return createResult({
    address: account.address,
    signature,
  });
};

const handleSendEvmTransaction = async (
  args: Record<string, unknown>,
  env: Env
): Promise<ToolCallResponse> => {
  const cdp = getCdpClient(env);
  const account = await resolveAccount(cdp, args);
  const { network, requested, chainId } = resolveNetworkInput(
    args.network,
    env,
    args.chainId
  );
  const to = parseAddress(args.to, "to");
  const idempotencyKey = parseOptionalString(args.idempotencyKey);
  const txRequest = {
    to,
    value: parseOptionalBigIntString(args.valueWei, "valueWei"),
    data: parseOptionalHex(args.data, "data"),
    nonce: parseOptionalNonce(args.nonce),
    gas: parseOptionalBigIntString(args.gasLimit, "gasLimit"),
    maxFeePerGas: parseOptionalBigIntString(
      args.maxFeePerGasWei,
      "maxFeePerGasWei"
    ),
    maxPriorityFeePerGas: parseOptionalBigIntString(
      args.maxPriorityFeePerGasWei,
      "maxPriorityFeePerGasWei"
    ),
    chainId,
  };

  const transactionHash = shouldUseCustomRpcFlow(network)
    ? await sendCustomRpcTransaction(
        cdp,
        account.address,
        network,
        txRequest,
        idempotencyKey
      )
    : (
        await (
          await account.useNetwork(network)
        ).sendTransaction({
          transaction: txRequest,
          idempotencyKey,
        })
      ).transactionHash;

  return createResult({
    from: account.address,
    requestedNetwork: requested,
    network,
    chainId,
    to,
    transactionHash,
  });
};

const AAVE_FORK_TOP_UP_MUTATION = `mutation ForkTopUp($request: ForkTopUpRequest!) {
  forkTopUp(request: $request) {
    message
    txHash
  }
}`;

const handleAaveForkTopUp = async (
  args: Record<string, unknown>,
  env: Env
): Promise<ToolCallResponse> => {
  const graphqlUrl =
    parseOptionalString(args.graphqlUrl) ?? env.AAVE_GRAPHQL_URL ?? undefined;
  if (!graphqlUrl) {
    throw new Error(
      "Missing GraphQL endpoint. Provide graphqlUrl or set AAVE_GRAPHQL_URL."
    );
  }

  const user = parseAddress(args.user, "user");
  const currency = parseAddress(args.currency, "currency");
  const value = parseRequiredString(args.value, "value");

  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: AAVE_FORK_TOP_UP_MUTATION,
      variables: {
        request: {
          user,
          erc20: {
            currency,
            value,
          },
        },
      },
    }),
  });

  const payload = (await response.json()) as {
    data?: {
      forkTopUp?: {
        message?: string;
        txHash?: string;
      };
    };
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok) {
    throw new Error(
      `Aave GraphQL request failed with status ${response.status}`
    );
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const messages = payload.errors
      .map((error) => error.message ?? "Unknown GraphQL error")
      .join(", ");
    throw new Error(messages);
  }

  return createResult({
    graphqlUrl,
    request: {
      user,
      erc20: {
        currency,
        value,
      },
    },
    result: payload.data?.forkTopUp ?? null,
  });
};

export const walletToolDefinitions = [
  {
    name: TOOL_GET_OR_CREATE_EVM_ACCOUNT,
    title: "Wallet Get or Create EVM Account",
    description: "Bootstrap an EVM server wallet account by name.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Logical account name.",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
    securitySchemes: [{ type: "noauth" }],
    _meta: {
      securitySchemes: [{ type: "noauth" }],
    },
  },
  {
    name: TOOL_GET_EVM_ACCOUNT,
    title: "Wallet Get EVM Account",
    description: "Fetch a server wallet account by address or name.",
    inputSchema: {
      type: "object",
      properties: {
        accountAddress: {
          type: "string",
          description: "EVM address of the account.",
        },
        accountName: {
          type: "string",
          description: "Name of the account.",
        },
      },
      additionalProperties: false,
    },
    securitySchemes: [{ type: "noauth" }],
    _meta: {
      securitySchemes: [{ type: "noauth" }],
    },
  },
  {
    name: TOOL_REQUEST_EVM_FAUCET,
    title: "Wallet Request EVM Faucet",
    description: "Request testnet faucet funds for a server wallet account.",
    inputSchema: {
      type: "object",
      properties: {
        accountAddress: {
          type: "string",
        },
        accountName: {
          type: "string",
        },
        network: {
          type: "string",
          description:
            "Optional network name, alias, or RPC URL. Defaults to WALLET_DEFAULT_NETWORK.",
        },
        token: {
          type: "string",
          description: "Optional faucet token. Defaults to eth.",
        },
      },
      additionalProperties: false,
    },
    securitySchemes: [{ type: "noauth" }],
    _meta: {
      securitySchemes: [{ type: "noauth" }],
    },
  },
  {
    name: TOOL_LIST_EVM_TOKEN_BALANCES,
    title: "Wallet List EVM Token Balances",
    description: "List token balances for an account on a target network.",
    inputSchema: {
      type: "object",
      properties: {
        accountAddress: {
          type: "string",
        },
        accountName: {
          type: "string",
        },
        network: {
          type: "string",
          description:
            "Optional network name, alias, or RPC URL. Defaults to WALLET_DEFAULT_NETWORK.",
        },
        pageSize: {
          type: "number",
        },
        pageToken: {
          type: "string",
        },
      },
      additionalProperties: false,
    },
    securitySchemes: [{ type: "noauth" }],
    _meta: {
      securitySchemes: [{ type: "noauth" }],
    },
  },
  {
    name: TOOL_SIGN_EVM_TRANSACTION,
    title: "Wallet Sign EVM Transaction",
    description: "Sign a serialized EVM transaction with a server wallet.",
    inputSchema: {
      type: "object",
      properties: {
        accountAddress: {
          type: "string",
        },
        accountName: {
          type: "string",
        },
        serializedTransaction: {
          type: "string",
          description: "0x-prefixed RLP-encoded transaction string.",
        },
        idempotencyKey: {
          type: "string",
        },
      },
      required: ["serializedTransaction"],
      additionalProperties: false,
    },
    securitySchemes: [{ type: "noauth" }],
    _meta: {
      securitySchemes: [{ type: "noauth" }],
    },
  },
  {
    name: TOOL_SEND_EVM_TRANSACTION,
    title: "Wallet Send EVM Transaction",
    description:
      "Sign and submit an EVM transaction with a server wallet on a CDP network or custom RPC URL.",
    inputSchema: {
      type: "object",
      properties: {
        accountAddress: {
          type: "string",
        },
        accountName: {
          type: "string",
        },
        network: {
          type: "string",
          description:
            "Optional network name, alias, or RPC URL. Defaults to WALLET_DEFAULT_NETWORK.",
        },
        chainId: {
          type: "number",
          description:
            "Optional chain id for custom RPC networks (for example 123456789).",
        },
        to: {
          type: "string",
        },
        valueWei: {
          type: "string",
        },
        data: {
          type: "string",
        },
        nonce: {
          type: "number",
        },
        gasLimit: {
          type: "string",
        },
        maxFeePerGasWei: {
          type: "string",
        },
        maxPriorityFeePerGasWei: {
          type: "string",
        },
        idempotencyKey: {
          type: "string",
        },
      },
      required: ["to"],
      additionalProperties: false,
    },
    securitySchemes: [{ type: "noauth" }],
    _meta: {
      securitySchemes: [{ type: "noauth" }],
    },
  },
  {
    name: TOOL_AAVE_FORK_TOP_UP,
    title: "Wallet Aave Fork Top Up",
    description:
      "Call the Aave forkTopUp GraphQL mutation to fund an address on the demo fork.",
    inputSchema: {
      type: "object",
      properties: {
        graphqlUrl: {
          type: "string",
          description:
            "Optional Aave GraphQL endpoint override. Defaults to AAVE_GRAPHQL_URL env var.",
        },
        user: {
          type: "string",
          description: "Wallet address to top up.",
        },
        currency: {
          type: "string",
          description: "ERC20 token address to mint/fund.",
        },
        value: {
          type: "string",
          description: "Token amount string expected by the forkTopUp API.",
        },
      },
      required: ["user", "currency", "value"],
      additionalProperties: false,
    },
    securitySchemes: [{ type: "noauth" }],
    _meta: {
      securitySchemes: [{ type: "noauth" }],
    },
  },
] as const;

export const handleWalletToolCall = async (
  call: ToolCallParams,
  env: Env
): Promise<ToolCallResponse | null> => {
  if (!toolNameSet.has(call.name)) {
    return null;
  }

  const args = parseRecord(call.arguments);

  try {
    if (call.name === TOOL_GET_OR_CREATE_EVM_ACCOUNT) {
      return await handleGetOrCreateEvmAccount(args, env);
    }

    if (call.name === TOOL_GET_EVM_ACCOUNT) {
      return await handleGetEvmAccount(args, env);
    }

    if (call.name === TOOL_REQUEST_EVM_FAUCET) {
      return await handleRequestEvmFaucet(args, env);
    }

    if (call.name === TOOL_LIST_EVM_TOKEN_BALANCES) {
      return await handleListEvmTokenBalances(args, env);
    }

    if (call.name === TOOL_SIGN_EVM_TRANSACTION) {
      return await handleSignEvmTransaction(args, env);
    }

    if (call.name === TOOL_AAVE_FORK_TOP_UP) {
      return await handleAaveForkTopUp(args, env);
    }

    return await handleSendEvmTransaction(args, env);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: message,
      code: -32_603,
    };
  }
};
