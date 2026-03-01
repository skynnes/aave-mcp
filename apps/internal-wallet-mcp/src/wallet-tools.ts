import {
  type Address,
  type Chain,
  createPublicClient,
  createWalletClient,
  defineChain,
  erc20Abi,
  http,
  isAddress,
  isHex,
  parseTransaction,
} from "viem";
import {
  generatePrivateKey,
  type PrivateKeyAccount,
  privateKeyToAccount,
} from "viem/accounts";
import {
  arbitrum,
  avalanche,
  base,
  baseSepolia,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "viem/chains";
import type { Env, ToolCallParams, ToolCallResponse } from "./types";

const TOOL_GET_OR_CREATE_EVM_ACCOUNT = "wallet_get_or_create_evm_account";
const TOOL_GET_EVM_ACCOUNT = "wallet_get_evm_account";
const TOOL_LIST_EVM_TOKEN_BALANCES = "wallet_list_evm_token_balances";
const TOOL_SIGN_EVM_TRANSACTION = "wallet_sign_evm_transaction";
const TOOL_SEND_EVM_TRANSACTION = "wallet_send_evm_transaction";
const TOOL_AAVE_FORK_TOP_UP = "wallet_aave_fork_top_up";

const KNOWN_CHAINS: Record<string, Chain> = {
  base,
  "base-sepolia": baseSepolia,
  ethereum: mainnet,
  "ethereum-sepolia": sepolia,
  avalanche,
  polygon,
  optimism,
  arbitrum,
};

const toolNameSet = new Set<string>([
  TOOL_GET_OR_CREATE_EVM_ACCOUNT,
  TOOL_GET_EVM_ACCOUNT,
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

interface AuthorizationContext {
  scopedNamePrefix: string;
}

interface StoredAccount {
  name: string;
  address: Address;
  encryptedPrivateKey: string;
  iv: string;
  createdAt: string;
}

type TokenMap = Record<string, Record<string, Address>>;
const SCOPED_NAME_SEPARATOR = "::";
const AUTH_CONTEXT_VERSION = "v1";

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

const parseAddress = (value: unknown, fieldName: string): Address => {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new Error(`${fieldName} must be a valid EVM address`);
  }

  return value;
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

const parseOptionalPageSize = (value: unknown): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error("pageSize must be a positive integer");
  }

  return value as number;
};

const toHex = (value: Uint8Array): string => {
  let output = "";
  for (const byte of value) {
    output += byte.toString(16).padStart(2, "0");
  }
  return output;
};

const requireDatabase = (env: Env): D1Database => {
  if (!env.DB) {
    throw new Error(
      "Missing DB binding. Configure D1 as env.DB in wrangler.toml."
    );
  }

  return env.DB;
};

const ensureSchema = async (env: Env): Promise<void> => {
  const db = requireDatabase(env);
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS wallet_accounts (
        name TEXT PRIMARY KEY,
        address TEXT NOT NULL UNIQUE,
        encrypted_private_key TEXT NOT NULL,
        iv TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`
    )
    .run();
  await db
    .prepare(
      "CREATE INDEX IF NOT EXISTS idx_wallet_accounts_address ON wallet_accounts(address)"
    )
    .run();
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (const [index, character] of Array.from(binary).entries()) {
    bytes[index] = character.charCodeAt(0);
  }
  return bytes;
};

const toBase64 = (value: Uint8Array): string => {
  let binary = "";
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

const importAesGcmKey = (keyBytes: Uint8Array): Promise<CryptoKey> => {
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
};

const hexToBytes = (value: `0x${string}`): Uint8Array => {
  const normalized = value.slice(2);
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    const chunk = normalized.slice(index, index + 2);
    const parsed = Number.parseInt(chunk, 16);
    if (Number.isNaN(parsed)) {
      throw new Error("Invalid hex key material");
    }
    bytes[index / 2] = parsed;
  }
  return bytes;
};

const deriveSha256 = async (value: string): Promise<Uint8Array> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return new Uint8Array(digest);
};

const buildAuthorizationContext = async (
  args: Record<string, unknown>,
  env: Env
): Promise<AuthorizationContext> => {
  const seed = parseRequiredString(args.seed, "seed");
  const pepper = parseOptionalString(env.INTERNAL_WALLET_AUTH_PEPPER) ?? "";
  const digest = await deriveSha256(
    `${AUTH_CONTEXT_VERSION}:${pepper}:${seed}`
  );

  return {
    scopedNamePrefix: `scope_${toHex(digest)}${SCOPED_NAME_SEPARATOR}`,
  };
};

const buildScopedAccountName = (
  accountName: string,
  authorization: AuthorizationContext
): string => {
  return `${authorization.scopedNamePrefix}${accountName}`;
};

const parseScopedAccountName = (
  scopedName: string,
  authorization: AuthorizationContext
): string | null => {
  if (!scopedName.startsWith(authorization.scopedNamePrefix)) {
    return null;
  }

  return scopedName.slice(authorization.scopedNamePrefix.length);
};

const getMasterKey = async (env: Env): Promise<CryptoKey> => {
  const keyMaterial =
    parseOptionalString(env.INTERNAL_WALLET_MASTER_KEY) ??
    "internal-wallet-mcp-dev-key";

  try {
    const base64Bytes = fromBase64(keyMaterial);
    if (base64Bytes.byteLength === 32) {
      return importAesGcmKey(base64Bytes);
    }
  } catch {
    // Fall through to alternate key material parsing.
  }

  if (
    isHex(keyMaterial) &&
    keyMaterial.startsWith("0x") &&
    keyMaterial.length === 66
  ) {
    return importAesGcmKey(hexToBytes(keyMaterial));
  }

  const derived = await deriveSha256(keyMaterial);
  return importAesGcmKey(derived);
};

const encryptPrivateKey = async (
  privateKey: `0x${string}`,
  env: Env
): Promise<{ encryptedPrivateKey: string; iv: string }> => {
  const key = await getMasterKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(privateKey);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    plaintext
  );

  return {
    encryptedPrivateKey: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
  };
};

const decryptPrivateKey = async (
  encryptedPrivateKey: string,
  iv: string,
  env: Env
): Promise<`0x${string}`> => {
  const key = await getMasterKey(env);
  const ciphertext = fromBase64(encryptedPrivateKey);
  const ivBytes = fromBase64(iv);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBytes,
    },
    key,
    ciphertext
  );

  const decoded = new TextDecoder().decode(plaintext);
  if (!isHex(decoded)) {
    throw new Error("Stored private key is invalid");
  }

  return decoded;
};

const mapStoredAccount = (
  value: {
    name: string;
    address: string;
    encrypted_private_key: string;
    iv: string;
    created_at: string;
  } | null,
  authorization: AuthorizationContext
): StoredAccount | null => {
  if (!value) {
    return null;
  }

  if (!isAddress(value.address)) {
    throw new Error(`Stored address for account ${value.name} is invalid`);
  }

  const unscopedName = parseScopedAccountName(value.name, authorization);
  if (!unscopedName) {
    return null;
  }

  return {
    name: unscopedName,
    address: value.address,
    encryptedPrivateKey: value.encrypted_private_key,
    iv: value.iv,
    createdAt: value.created_at,
  };
};

const getAccountByName = async (
  env: Env,
  name: string,
  authorization: AuthorizationContext
): Promise<StoredAccount | null> => {
  await ensureSchema(env);
  const db = requireDatabase(env);
  const scopedName = buildScopedAccountName(name, authorization);
  const row = await db
    .prepare(
      "SELECT name, address, encrypted_private_key, iv, created_at FROM wallet_accounts WHERE name = ?1"
    )
    .bind(scopedName)
    .first<{
      name: string;
      address: string;
      encrypted_private_key: string;
      iv: string;
      created_at: string;
    }>();
  return mapStoredAccount(row ?? null, authorization);
};

const getAccountByAddress = async (
  env: Env,
  address: Address,
  authorization: AuthorizationContext
): Promise<StoredAccount | null> => {
  await ensureSchema(env);
  const db = requireDatabase(env);
  const row = await db
    .prepare(
      "SELECT name, address, encrypted_private_key, iv, created_at FROM wallet_accounts WHERE address = ?1"
    )
    .bind(address.toLowerCase())
    .first<{
      name: string;
      address: string;
      encrypted_private_key: string;
      iv: string;
      created_at: string;
    }>();
  return mapStoredAccount(row ?? null, authorization);
};

const createAccount = async (
  env: Env,
  name: string,
  authorization: AuthorizationContext
): Promise<StoredAccount> => {
  const scopedName = buildScopedAccountName(name, authorization);
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const encrypted = await encryptPrivateKey(privateKey, env);
  const createdAt = new Date().toISOString();
  const db = requireDatabase(env);

  try {
    await db
      .prepare(
        "INSERT INTO wallet_accounts(name, address, encrypted_private_key, iv, created_at) VALUES (?1, ?2, ?3, ?4, ?5)"
      )
      .bind(
        scopedName,
        account.address.toLowerCase(),
        encrypted.encryptedPrivateKey,
        encrypted.iv,
        createdAt
      )
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE") || message.includes("constraint")) {
      const existing = await getAccountByName(env, name, authorization);
      if (existing) {
        return existing;
      }
    }
    throw error;
  }

  const created = await getAccountByName(env, name, authorization);
  if (!created) {
    throw new Error("Failed to create account");
  }

  return created;
};

const loadAccountSigner = async (
  env: Env,
  args: Record<string, unknown>,
  authorization: AuthorizationContext
): Promise<{ stored: StoredAccount; signer: PrivateKeyAccount }> => {
  const accountAddress = args.accountAddress;
  const accountName = args.accountName;

  if (accountAddress === undefined && accountName === undefined) {
    throw new Error("Provide accountAddress or accountName");
  }

  if (accountAddress !== undefined && accountName !== undefined) {
    throw new Error("Provide only one of accountAddress or accountName");
  }

  const stored =
    accountAddress !== undefined
      ? await getAccountByAddress(
          env,
          parseAddress(accountAddress, "accountAddress"),
          authorization
        )
      : await getAccountByName(
          env,
          parseRequiredString(accountName, "accountName"),
          authorization
        );

  if (!stored) {
    throw new Error("Account not found");
  }

  const privateKey = await decryptPrivateKey(
    stored.encryptedPrivateKey,
    stored.iv,
    env
  );

  return {
    stored,
    signer: privateKeyToAccount(privateKey),
  };
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

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
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

const resolveChain = async (
  network: string,
  chainId?: number
): Promise<{ chain: Chain; rpcUrl?: string }> => {
  const knownChain = KNOWN_CHAINS[network];
  if (knownChain) {
    if (chainId !== undefined && chainId !== knownChain.id) {
      throw new Error(
        `Provided chainId ${chainId} does not match ${network} chainId ${knownChain.id}`
      );
    }
    return { chain: knownChain };
  }

  if (!isHttpUrl(network)) {
    throw new Error(
      `Unknown network ${network}. Use a known network name or an RPC URL.`
    );
  }

  const rpcChainId = await resolveRpcChainId(network);
  const resolvedChainId = chainId ?? rpcChainId;
  if (resolvedChainId !== rpcChainId) {
    throw new Error(
      `Provided chainId ${resolvedChainId} does not match RPC chainId ${rpcChainId}`
    );
  }

  return {
    rpcUrl: network,
    chain: defineChain({
      id: resolvedChainId,
      name: `custom-${resolvedChainId}`,
      network: `custom-${resolvedChainId}`,
      nativeCurrency: {
        name: "Ether",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: {
        default: { http: [network] },
        public: { http: [network] },
      },
    }),
  };
};

const parseTokenMap = (env: Env): TokenMap => {
  const raw = env.INTERNAL_WALLET_TOKEN_MAP_JSON;
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const mapped: TokenMap = {};

    for (const [network, value] of Object.entries(parsed)) {
      if (typeof value !== "object" || value === null) {
        continue;
      }

      const tokenEntries = value as Record<string, unknown>;
      const tokens: Record<string, Address> = {};

      for (const [symbol, tokenAddress] of Object.entries(tokenEntries)) {
        if (typeof tokenAddress === "string" && isAddress(tokenAddress)) {
          tokens[symbol.toLowerCase()] = tokenAddress;
        }
      }

      mapped[network] = tokens;
    }

    return mapped;
  } catch {
    throw new Error("INTERNAL_WALLET_TOKEN_MAP_JSON must be valid JSON object");
  }
};

const handleGetOrCreateEvmAccount = async (
  args: Record<string, unknown>,
  env: Env,
  authorization: AuthorizationContext
): Promise<ToolCallResponse> => {
  const name = parseRequiredString(args.name, "name");
  const existing = await getAccountByName(env, name, authorization);
  const account = existing ?? (await createAccount(env, name, authorization));

  return createResult({
    name: account.name,
    address: account.address,
    type: "internal",
    policies: [],
    createdAt: account.createdAt,
  });
};

const handleGetEvmAccount = async (
  args: Record<string, unknown>,
  env: Env,
  authorization: AuthorizationContext
): Promise<ToolCallResponse> => {
  const { stored } = await loadAccountSigner(env, args, authorization);

  return createResult({
    name: stored.name,
    address: stored.address,
    type: "internal",
    policies: [],
    createdAt: stored.createdAt,
  });
};

const handleListEvmTokenBalances = async (
  args: Record<string, unknown>,
  env: Env,
  authorization: AuthorizationContext
): Promise<ToolCallResponse> => {
  const { stored } = await loadAccountSigner(env, args, authorization);
  const { network, requested, chainId } = resolveNetworkInput(
    args.network,
    env
  );
  const pageSize = parseOptionalPageSize(args.pageSize);
  const pageTokenRaw = parseOptionalString(args.pageToken);
  const pageOffset = pageTokenRaw ? Number.parseInt(pageTokenRaw, 10) : 0;

  if (!Number.isInteger(pageOffset) || pageOffset < 0) {
    throw new Error("pageToken must be an integer offset string");
  }

  const { chain, rpcUrl } = await resolveChain(network, chainId);
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const balances: Record<string, unknown>[] = [];
  const native = await publicClient.getBalance({ address: stored.address });
  balances.push({
    token: "eth",
    symbol: chain.nativeCurrency.symbol,
    decimals: chain.nativeCurrency.decimals,
    amount: native.toString(),
  });

  const tokenMap = parseTokenMap(env);
  const tokenEntries = Object.entries({
    ...(tokenMap[network] ?? {}),
    ...(tokenMap[requested] ?? {}),
  });

  for (const [symbol, tokenAddress] of tokenEntries) {
    try {
      const [amount, decimals, onChainSymbol] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [stored.address],
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "decimals",
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "symbol",
        }),
      ]);

      balances.push({
        token: symbol,
        tokenAddress,
        symbol: onChainSymbol,
        decimals,
        amount: amount.toString(),
      });
    } catch {
      balances.push({
        token: symbol,
        tokenAddress,
        error: "Failed to fetch token balance",
      });
    }
  }

  const effectivePageSize = pageSize ?? balances.length;
  const page = balances.slice(pageOffset, pageOffset + effectivePageSize);
  const nextOffset = pageOffset + page.length;
  const nextPageToken =
    nextOffset < balances.length ? String(nextOffset) : undefined;

  return createResult({
    address: stored.address,
    requestedNetwork: requested,
    network,
    balances: page,
    nextPageToken,
  });
};

const handleSignEvmTransaction = async (
  args: Record<string, unknown>,
  env: Env,
  authorization: AuthorizationContext
): Promise<ToolCallResponse> => {
  const { stored, signer } = await loadAccountSigner(env, args, authorization);
  const serializedTransaction = parseOptionalHex(
    args.serializedTransaction,
    "serializedTransaction"
  );

  if (!serializedTransaction) {
    throw new Error("serializedTransaction is required");
  }

  const parsed = parseTransaction(serializedTransaction);
  const signature =
    "r" in parsed && typeof parsed.r === "string"
      ? serializedTransaction
      : await signer.signTransaction(parsed);

  return createResult({
    address: stored.address,
    signature,
  });
};

const handleSendEvmTransaction = async (
  args: Record<string, unknown>,
  env: Env,
  authorization: AuthorizationContext
): Promise<ToolCallResponse> => {
  const { stored, signer } = await loadAccountSigner(env, args, authorization);
  const { network, requested, chainId } = resolveNetworkInput(
    args.network,
    env,
    args.chainId
  );
  const { chain, rpcUrl } = await resolveChain(network, chainId);
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account: signer,
    chain,
    transport: http(rpcUrl),
  });

  const to = parseAddress(args.to, "to");
  const value = parseOptionalBigIntString(args.valueWei, "valueWei") ?? 0n;
  const data = parseOptionalHex(args.data, "data");
  const nonce =
    parseOptionalNonce(args.nonce) ??
    Number(
      await publicClient.getTransactionCount({
        address: stored.address,
        blockTag: "pending",
      })
    );

  const estimatedFees = await publicClient.estimateFeesPerGas();
  const maxPriorityFeePerGas =
    parseOptionalBigIntString(
      args.maxPriorityFeePerGasWei,
      "maxPriorityFeePerGasWei"
    ) ??
    estimatedFees.maxPriorityFeePerGas ??
    1_000_000_000n;
  const maxFeePerGas =
    parseOptionalBigIntString(args.maxFeePerGasWei, "maxFeePerGasWei") ??
    estimatedFees.maxFeePerGas ??
    estimatedFees.gasPrice ??
    1_000_000_000n;

  const gas =
    parseOptionalBigIntString(args.gasLimit, "gasLimit") ??
    (await publicClient.estimateGas({
      account: stored.address,
      to,
      value,
      data,
      nonce,
      maxFeePerGas,
      maxPriorityFeePerGas,
    }));

  const transactionHash = await walletClient.sendTransaction({
    account: signer,
    chain,
    to,
    value,
    data,
    nonce,
    gas,
    maxFeePerGas,
    maxPriorityFeePerGas,
    type: "eip1559",
  });

  return createResult({
    from: stored.address,
    requestedNetwork: requested,
    network,
    chainId: chain.id,
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
        seed: {
          type: "string",
          description:
            "Authorization seed used to scope wallet ownership and access.",
        },
        name: {
          type: "string",
          description: "Logical account name.",
        },
      },
      required: ["seed", "name"],
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
        seed: {
          type: "string",
          description:
            "Authorization seed used to scope wallet ownership and access.",
        },
        accountAddress: {
          type: "string",
          description: "EVM address of the account.",
        },
        accountName: {
          type: "string",
          description: "Name of the account.",
        },
      },
      required: ["seed"],
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
        seed: {
          type: "string",
          description:
            "Authorization seed used to scope wallet ownership and access.",
        },
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
      required: ["seed"],
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
        seed: {
          type: "string",
          description:
            "Authorization seed used to scope wallet ownership and access.",
        },
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
      required: ["seed", "serializedTransaction"],
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
      "Sign and submit an EVM transaction with a server wallet on a configured network or custom RPC URL.",
    inputSchema: {
      type: "object",
      properties: {
        seed: {
          type: "string",
          description:
            "Authorization seed used to scope wallet ownership and access.",
        },
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
      required: ["seed", "to"],
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
        seed: {
          type: "string",
          description:
            "Authorization seed used to scope wallet ownership and access.",
        },
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
      required: ["seed", "user", "currency", "value"],
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
    const authorization = await buildAuthorizationContext(args, env);

    if (call.name === TOOL_GET_OR_CREATE_EVM_ACCOUNT) {
      return await handleGetOrCreateEvmAccount(args, env, authorization);
    }

    if (call.name === TOOL_GET_EVM_ACCOUNT) {
      return await handleGetEvmAccount(args, env, authorization);
    }

    if (call.name === TOOL_LIST_EVM_TOKEN_BALANCES) {
      return await handleListEvmTokenBalances(args, env, authorization);
    }

    if (call.name === TOOL_SIGN_EVM_TRANSACTION) {
      return await handleSignEvmTransaction(args, env, authorization);
    }

    if (call.name === TOOL_AAVE_FORK_TOP_UP) {
      return await handleAaveForkTopUp(args, env);
    }

    return await handleSendEvmTransaction(args, env, authorization);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      error: message,
      code: -32_603,
    };
  }
};
