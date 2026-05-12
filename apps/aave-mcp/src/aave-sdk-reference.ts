export const AAVE_CLIENT_VERSION = "4.2.0";
export const AAVE_V4_GRAPHQL_URL = "https://api.aave.com/graphql";

export const AAVE_SDK_ACTION_NAMES = [
  "activities",
  "asset",
  "assetBorrowHistory",
  "assetPriceHistory",
  "assetSupplyHistory",
  "borrow",
  "borrowApyHistory",
  "borrowSwapQuote",
  "cancelSwap",
  "chain",
  "chains",
  "claimRewards",
  "exchangeRate",
  "hasProcessedKnownTransaction",
  "hub",
  "hubAssetInterestRateModel",
  "hubAssets",
  "hubSpokeConfigs",
  "hubSummaryHistory",
  "hubs",
  "liquidatePosition",
  "preparePositionSwap",
  "prepareSwapCancel",
  "prepareTokenSwap",
  "preview",
  "protocolHistory",
  "renounceSpokeUserPositionManager",
  "repay",
  "repayWithSupplyQuote",
  "reserve",
  "reserveHolders",
  "reserves",
  "setSpokeUserPositionManager",
  "setUserSuppliesAsCollateral",
  "spoke",
  "spokePositionManagers",
  "spokeSummaryHistory",
  "spokeUserPositionManagers",
  "spokes",
  "stableVault",
  "stableVaultAssignRate",
  "stableVaultClaimStatus",
  "stableVaultClaimSurplus",
  "stableVaultDeposit",
  "stableVaultMovements",
  "stableVaultRateUsers",
  "stableVaultUnassignRate",
  "stableVaultUserPositions",
  "stableVaultWithdraw",
  "stableVaultWithdrawRedeem",
  "stableVaults",
  "supply",
  "supplyApyHistory",
  "supplySwapQuote",
  "swap",
  "swapStatus",
  "swappableTokens",
  "tokenSwapQuote",
  "updateUserPositionConditions",
  "userBalances",
  "userBorrows",
  "userClaimableRewards",
  "userPosition",
  "userPositions",
  "userRiskPremiumBreakdown",
  "userSummary",
  "userSummaryHistory",
  "userSupplies",
  "userSwaps",
  "waitForStableVaultWithdrawClaim",
  "waitForSwapOutcome",
  "withdraw",
  "withdrawSwapQuote",
] as const;

export type AaveSdkActionName = (typeof AAVE_SDK_ACTION_NAMES)[number];

export const READ_ONLY_ACTIONS = [
  "activities",
  "asset",
  "assetBorrowHistory",
  "assetPriceHistory",
  "assetSupplyHistory",
  "borrowApyHistory",
  "chain",
  "chains",
  "exchangeRate",
  "hasProcessedKnownTransaction",
  "hub",
  "hubAssetInterestRateModel",
  "hubAssets",
  "hubSpokeConfigs",
  "hubSummaryHistory",
  "hubs",
  "protocolHistory",
  "reserve",
  "reserveHolders",
  "reserves",
  "spoke",
  "spokePositionManagers",
  "spokeSummaryHistory",
  "spokeUserPositionManagers",
  "spokes",
  "stableVault",
  "stableVaultClaimStatus",
  "stableVaultMovements",
  "stableVaultRateUsers",
  "stableVaultUserPositions",
  "stableVaults",
  "supplyApyHistory",
  "swapStatus",
  "swappableTokens",
  "userBalances",
  "userBorrows",
  "userClaimableRewards",
  "userPosition",
  "userPositions",
  "userRiskPremiumBreakdown",
  "userSummary",
  "userSummaryHistory",
  "userSupplies",
  "userSwaps",
] as const satisfies readonly AaveSdkActionName[];

export const QUOTE_AND_PREVIEW_ACTIONS = [
  "borrowSwapQuote",
  "preparePositionSwap",
  "prepareSwapCancel",
  "prepareTokenSwap",
  "preview",
  "repayWithSupplyQuote",
  "supplySwapQuote",
  "tokenSwapQuote",
  "withdrawSwapQuote",
] as const satisfies readonly AaveSdkActionName[];

export const TRANSACTION_ACTIONS = [
  "borrow",
  "cancelSwap",
  "claimRewards",
  "liquidatePosition",
  "renounceSpokeUserPositionManager",
  "repay",
  "setSpokeUserPositionManager",
  "setUserSuppliesAsCollateral",
  "stableVaultAssignRate",
  "stableVaultClaimSurplus",
  "stableVaultDeposit",
  "stableVaultUnassignRate",
  "stableVaultWithdraw",
  "stableVaultWithdrawRedeem",
  "supply",
  "swap",
  "updateUserPositionConditions",
  "withdraw",
] as const satisfies readonly AaveSdkActionName[];

export const POLLING_ACTIONS = [
  "waitForStableVaultWithdrawClaim",
  "waitForSwapOutcome",
] as const satisfies readonly AaveSdkActionName[];

type ActionCategory = "read" | "quote" | "transaction" | "polling";

interface SdkReference {
  description: string;
  signature: string;
  request: Record<string, unknown>;
  options?: Record<string, unknown>;
  notes?: string[];
  exampleCode?: string;
}

const actionCategoryForTypes = (action: AaveSdkActionName): ActionCategory => {
  if ((READ_ONLY_ACTIONS as readonly string[]).includes(action)) {
    return "read";
  }

  if ((QUOTE_AND_PREVIEW_ACTIONS as readonly string[]).includes(action)) {
    return "quote";
  }

  if ((POLLING_ACTIONS as readonly string[]).includes(action)) {
    return "polling";
  }

  return "transaction";
};

const AAVE_SDK_TYPE_ACTION_DECLARATIONS = AAVE_SDK_ACTION_NAMES.map(
  (action) => {
    const category = actionCategoryForTypes(action);

    return `  /**
   * ${category} action. Returns the unwrapped SDK value, or AaveSdkActionError for SDK/API failures.
   * Call get_aave_sdk_reference({ action: "${action}" }) for the exact request shape and a compact example.
   */
  ${action}: (request: unknown, options?: QueryOptions) => Promise<unknown>;`;
  }
).join("\n");

export const AAVE_SDK_TYPES = `/**
 * Aave v4 SDK codemode surface.
 *
 * In this sandbox, call SDK actions through the aave namespace.
 * The host owns AaveClient.create(), so omit the client argument used by @aave/client/actions.
 * Actions return unwrapped SDK values, not ResultAsync. Use await aave.action(request), not .match(), .isOk(), or .isErr().
 * SDK/API failures return AaveSdkActionError objects with guidance; check __typename before reading success fields.
 * Do not catch aave action errors inside sandbox code; let MCP return the error with guidance.
 * Opaque ids are strings, but must be discovered from SDK responses; do not fabricate ReserveId, StableVaultId, SwapQuoteId, or user item ids.
 * You may write TypeScript syntax; common type annotations are stripped before execution.
 */
type EvmAddress = \`0x\${string}\`;
type ChainId = number;
type BigDecimal = string;
type OpaqueAaveId = string;
type ReserveId = OpaqueAaveId;
type SpokeId = OpaqueAaveId;
type HubId = OpaqueAaveId;
type HubAssetId = OpaqueAaveId;
type StableVaultId = OpaqueAaveId;
type StableVaultWithdrawClaimId = OpaqueAaveId;
type BoostedRateId = OpaqueAaveId;
type SwapId = OpaqueAaveId;
type SwapQuoteId = OpaqueAaveId;
type UserPositionId = OpaqueAaveId;
type UserSupplyItemId = OpaqueAaveId;
type UserBorrowItemId = OpaqueAaveId;
type RewardId = OpaqueAaveId;
type Currency = "USD" | "EUR" | "GBP";
type TimeWindow = "LAST_DAY" | "LAST_WEEK" | "LAST_MONTH" | "LAST_SIX_MONTHS" | "LAST_YEAR" | "ALL";
type OrderDirection = "ASC" | "DESC";
type PageSize = "TEN" | "FIFTY";
type RequestPolicy = "cache-first" | "cache-and-network" | "network-only" | "cache-only";
type QueryOptions = {
  currency?: Currency;
  timeWindow?: TimeWindow;
  requestPolicy?: RequestPolicy;
};
type AmountInput = { exact: BigDecimal } | { max: true };
type ReserveAmountInput = { erc20: { value: BigDecimal; permitSig?: unknown } } | { native: BigDecimal };
type RepayAmountInput = { erc20: { value: AmountInput; permit?: unknown } } | { native: AmountInput };
type WithdrawAmountInput = { erc20: AmountInput } | { native: AmountInput };
type TokenInput = { erc20: EvmAddress } | { native: ChainId };
type ChainInput = { chainId: ChainId };
type ChainListInput = { query: { filter: "ALL" | "MAINNET_ONLY" | "TESTNET_ONLY" } | { chainIds: ChainId[] } };
type AddressOnChain = { address: EvmAddress; chainId: ChainId };
type UserSpokeQuery = { query: { userSpoke: { user: EvmAddress; spoke: SpokeId } } };
type UserBalancesFilter =
  | { chains: { chainIds: ChainId[]; byReservesType?: "ALL" | "SUPPLIED" | "BORROWED" } }
  | { hub: AddressOnChain & { byReservesType?: "ALL" | "SUPPLIED" | "BORROWED" } }
  | { hubId: { hubId: string; byReservesType?: "ALL" | "SUPPLIED" | "BORROWED" } }
  | { tokens: { chainTokens: AddressOnChain[]; byReservesType?: "ALL" | "SUPPLIED" | "BORROWED" } }
  | { swappable: { chainIds: ChainId[] } }
  | { spoke: AddressOnChain & { byReservesType?: "ALL" | "SUPPLIED" | "BORROWED" } }
  | { userPosition: { userPositionId: string; byReservesType?: "ALL" | "SUPPLIED" | "BORROWED" } };
type PageInput = { pageSize?: PageSize; cursor?: string };
type AaveSdkActionError = {
  __typename: "AaveSdkActionError";
  action: string;
  message: string;
  guidance: string;
};

declare const aave: {
${AAVE_SDK_TYPE_ACTION_DECLARATIONS}
};
`;

export const COMMON_REFERENCES: Partial<
  Record<AaveSdkActionName, SdkReference>
> = {
  chains: {
    description:
      "List supported chains. Use filter ALL, MAINNET_ONLY, or TESTNET_ONLY.",
    signature: "aave.chains(request)",
    request: { query: { filter: "ALL" } },
    exampleCode: `async () => {
  const chains = await aave.chains({ query: { filter: "ALL" } });
  return chains.map((chain) => ({
    chainId: chain.chainId,
    name: chain.name,
    isTestnet: chain.isTestnet,
  }));
}`,
  },
  chain: {
    description: "Fetch one supported chain by numeric chain ID.",
    signature: "aave.chain({ chainId })",
    request: { chainId: 1 },
    exampleCode: `async () => {
  const chain = await aave.chain({ chainId: 1 });

  if (!chain) {
    return null;
  }

  return {
    chainId: chain.chainId,
    name: chain.name,
    isTestnet: chain.isTestnet,
  };
}`,
  },
  asset: {
    description:
      "Fetch one ERC20 protocol asset by underlying token or by an encoded AssetId.",
    signature: "aave.asset(request, options?)",
    request: {
      query: {
        token: {
          chainId: 1,
          address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
      },
    },
    notes: [
      "Use query.token when you know a token address; it is the least ambiguous lookup path.",
      "Do not pass reserve.asset.id into query.assetId. AssetId is an encoded hub asset id, not every displayed id field is accepted by this scalar.",
      "The direct asset lookup response uses asset.token.info.symbol and asset.price.current.value.",
      "Asset aggregate totals are ExchangeAmountWithChange values such as summary.totalSupplied.exchange.current.value.",
    ],
    exampleCode: `async () => {
  const asset = await aave.asset({
    query: {
      token: {
        chainId: 1,
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      },
    },
  });

  if (!asset) {
    return null;
  }

  return {
    id: asset.id,
    symbol: asset.token.info.symbol,
    priceUsd: asset.price.current.value,
    suppliedUsd: asset.summary.totalSupplied.exchange.current.value,
    borrowedUsd: asset.summary.totalBorrowed.exchange.current.value,
  };
}`,
  },
  assetPriceHistory: {
    description: "Fetch historical token price samples for one ERC20 token.",
    signature: "aave.assetPriceHistory(request)",
    request: {
      query: {
        token: {
          chainId: 1,
          address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
      },
      window: "LAST_WEEK",
    },
    notes: [
      "The request carries window; currency is not a top-level request field for assetPriceHistory.",
      "Return only the recent samples you need.",
    ],
    exampleCode: `async () => {
  const samples = await aave.assetPriceHistory({
    query: {
      token: {
        chainId: 1,
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      },
    },
    window: "LAST_WEEK",
  });

  return samples.slice(0, 5).map((sample) => ({
    date: sample.date,
    priceUsd: sample.price,
  }));
}`,
  },
  assetSupplyHistory: {
    description: "Fetch historical supplied liquidity samples for one asset.",
    signature: "aave.assetSupplyHistory(request, options?)",
    request: {
      query: {
        token: {
          chainId: 1,
          address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
      },
      window: "LAST_WEEK",
    },
    exampleCode: `async () => {
  const samples = await aave.assetSupplyHistory({
    query: {
      token: {
        chainId: 1,
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      },
    },
    window: "LAST_WEEK",
  });

  return samples.slice(0, 5).map((sample) => ({
    date: sample.date,
    supplied: sample.amount.value,
    averageSupplyApy: sample.averageApy.normalized,
  }));
}`,
  },
  assetBorrowHistory: {
    description: "Fetch historical borrowed liquidity samples for one asset.",
    signature: "aave.assetBorrowHistory(request, options?)",
    request: {
      query: {
        token: {
          chainId: 1,
          address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
      },
      window: "LAST_WEEK",
    },
    exampleCode: `async () => {
  const samples = await aave.assetBorrowHistory({
    query: {
      token: {
        chainId: 1,
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      },
    },
    window: "LAST_WEEK",
  });

  return samples.slice(0, 5).map((sample) => ({
    date: sample.date,
    borrowed: sample.amount.value,
    averageBorrowApy: sample.averageApy.normalized,
  }));
}`,
  },
  exchangeRate: {
    description: "Fetch a token-to-fiat exchange rate.",
    signature: "aave.exchangeRate(request)",
    request: {
      from: {
        erc20: {
          chainId: 1,
          address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
      },
      to: "USD",
    },
    notes: [
      "Use from.erc20 for ERC20 tokens. Native assets use the SDK's native token variant.",
    ],
    exampleCode: `async () => {
  const rate = await aave.exchangeRate({
    from: {
      erc20: {
        chainId: 1,
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      },
    },
    to: "USD",
  });

  return {
    currency: rate.name,
    value: rate.value,
  };
}`,
  },
  hasProcessedKnownTransaction: {
    description:
      "Check whether the Aave API has indexed a known transaction operation.",
    signature: "aave.hasProcessedKnownTransaction(request)",
    request: {
      txHash:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      operations: ["SPOKE_SUPPLY"],
    },
    notes: [
      "Operation values are OperationType enums such as SPOKE_SUPPLY, SPOKE_BORROW, SPOKE_REPAY, SPOKE_WITHDRAW, SPOKE_SET_USER_USING_AS_COLLATERAL, and LIQUIDATION.",
      "Do not use activity type names such as SUPPLY; the API rejects them for this request.",
      "This returns a boolean and uses network-only status checks internally.",
    ],
    exampleCode: `async () => {
  const processed = await aave.hasProcessedKnownTransaction({
    txHash:
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    operations: ["SPOKE_SUPPLY"],
  });

  return { processed };
}`,
  },
  protocolHistory: {
    description: "Fetch protocol-wide historical supplied and borrowed values.",
    signature: "aave.protocolHistory(request)",
    request: { currency: "USD", window: "LAST_WEEK" },
    notes: [
      "Use window on the request. Return a sliced projection; full history can be larger than needed.",
    ],
    exampleCode: `async () => {
  const samples = await aave.protocolHistory({
    currency: "USD",
    window: "LAST_WEEK",
  });

  return samples.slice(0, 5).map((sample) => ({
    date: sample.date,
    depositsUsd: sample.deposits.value,
    borrowsUsd: sample.borrows.value,
  }));
}`,
  },
  hub: {
    description: "Fetch one hub by opaque hub id or by address and chain ID.",
    signature: "aave.hub(request, options?)",
    request: { query: { hubId: "hub-id-from-aave.hubs" } },
    notes: [
      "Use aave.hubs first when you need to discover hub ids.",
      "Hub summary totals are ExchangeAmountWithChange objects; use totalSupplied.current.value and totalBorrowed.current.value.",
    ],
    exampleCode: `async () => {
  const hubs = await aave.hubs({ query: { chainIds: [1] } });
  const hub = await aave.hub({ query: { hubId: hubs[0].id } });

  if (!hub) {
    return null;
  }

  return {
    id: hub.id,
    name: hub.name,
    address: hub.address,
    chainId: hub.chain.chainId,
    totalSuppliedUsd: hub.summary.totalSupplied.current.value,
    totalBorrowedUsd: hub.summary.totalBorrowed.current.value,
  };
}`,
  },
  hubs: {
    description: "List hubs, commonly filtered by chain IDs.",
    signature: "aave.hubs(request, options?)",
    request: { query: { chainIds: [1] } },
    notes: [
      "Return a compact projection; full hub objects include nested summaries.",
      "Use hub.id for hubAssets, hubSpokeConfigs, hubSummaryHistory, and other HubId requests.",
      "Hub summary totals are ExchangeAmountWithChange objects; use totalSupplied.current.value and totalBorrowed.current.value.",
    ],
    exampleCode: `async () => {
  const hubs = await aave.hubs({ query: { chainIds: [1] } });
  return hubs.map((hub) => ({
    id: hub.id,
    name: hub.name,
    address: hub.address,
    chainId: hub.chain.chainId,
    totalSuppliedUsd: hub.summary.totalSupplied.current.value,
    totalBorrowedUsd: hub.summary.totalBorrowed.current.value,
  }));
}`,
  },
  hubAssets: {
    description: "List assets configured on a specific hub.",
    signature: "aave.hubAssets(request, options?)",
    request: { query: { hubId: "hub-id-from-aave.hubs" } },
    notes: [
      "Use aave.hubs first to discover hub.id.",
      "HubAsset summary fields are Erc20Amount objects such as summary.supplied.exchange.value, not ExchangeAmountWithChange.",
      "Return a compact projection; hub asset objects include nested hub, settings, and userState data.",
    ],
    exampleCode: `async () => {
  const hubs = await aave.hubs({ query: { chainIds: [1] } });
  const assets = await aave.hubAssets({ query: { hubId: hubs[0].id } });

  return assets.map((asset) => ({
    id: asset.id,
    symbol: asset.underlying.info.symbol,
    suppliedUsd: asset.summary.supplied.exchange.value,
    borrowedUsd: asset.summary.borrowed.exchange.value,
    availableLiquidityUsd: asset.summary.availableLiquidity.exchange.value,
    supplyApy: asset.summary.supplyApy.normalized,
    borrowApy: asset.summary.borrowApy.normalized,
  }));
}`,
  },
  hubAssetInterestRateModel: {
    description:
      "Fetch utilization, supply, and borrow rate points for a hub asset.",
    signature: "aave.hubAssetInterestRateModel(request, options?)",
    request: {
      query: { hubAssetId: "hub-asset-id-from-aave.hubAssets" },
    },
    notes: [
      "Use aave.hubs then aave.hubAssets first to discover hub asset ids.",
      "The response is an array of model points, not a paginated object.",
      "Points expose utilizationRate.normalized, supplyRate.normalized, borrowRate.normalized, and liquidityDistance.amount.value.",
    ],
    exampleCode: `async () => {
  const hubs = await aave.hubs({ query: { chainIds: [1] } });
  const assets = await aave.hubAssets({ query: { hubId: hubs[0].id } });
  const points = await aave.hubAssetInterestRateModel({
    query: { hubAssetId: assets[0].id },
  });

  return points.slice(0, 10).map((point) => ({
    utilizationRate: point.utilizationRate.normalized,
    supplyRate: point.supplyRate.normalized,
    borrowRate: point.borrowRate.normalized,
    liquidityDistance: point.liquidityDistance.amount.value,
  }));
}`,
  },
  hubSummaryHistory: {
    description: "Fetch historical summary samples for a specific hub.",
    signature: "aave.hubSummaryHistory(request)",
    request: {
      query: { hubId: "hub-id-from-aave.hubs" },
      currency: "USD",
      window: "LAST_WEEK",
    },
    notes: [
      "Use aave.hubs first to discover hub.id.",
      "Samples use date, deposits, borrows, availableLiquidity, and utilizationRate.",
    ],
    exampleCode: `async () => {
  const hubs = await aave.hubs({ query: { chainIds: [1] } });
  const samples = await aave.hubSummaryHistory({
    query: { hubId: hubs[0].id },
    currency: "USD",
    window: "LAST_WEEK",
  });

  return samples.slice(0, 5).map((sample) => ({
    date: sample.date,
    depositsUsd: sample.deposits.value,
    borrowsUsd: sample.borrows.value,
    availableLiquidityUsd: sample.availableLiquidity.value,
    utilizationRate: sample.utilizationRate.normalized,
  }));
}`,
  },
  hubSpokeConfigs: {
    description: "Fetch per-asset configuration for one hub/spoke pair.",
    signature: "aave.hubSpokeConfigs(request, options?)",
    request: {
      hubId: "hub-id-from-aave.hubs",
      spokeId: "spoke-id-from-aave.spokes",
    },
    notes: [
      "Discover hubId with aave.hubs and spokeId with aave.spokes before calling this action.",
      "Cap fields are Erc20Amount objects; use supplyCap.amount.value and borrowCap.amount.value.",
    ],
    exampleCode: `async () => {
  const hubs = await aave.hubs({ query: { chainIds: [1] } });
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const configs = await aave.hubSpokeConfigs({
    hubId: hubs[0].id,
    spokeId: spokes[0].id,
  });

  return configs.map((config) => ({
    hub: config.hub.name,
    spoke: config.spoke.name,
    symbol: config.asset.underlying.info.symbol,
    supplyCap: config.supplyCap.amount.value,
    borrowCap: config.borrowCap.amount.value,
    active: config.active,
    halted: config.halted,
  }));
}`,
  },
  spoke: {
    description:
      "Fetch one spoke by opaque spoke id or by address and chain ID.",
    signature: "aave.spoke(request, options?)",
    request: { query: { spokeId: "spoke-id-from-aave.spokes" } },
    notes: [
      "Use aave.spokes first when you need to discover spoke ids.",
      "Spoke summary totals are ExchangeAmount objects; use totalSupplied.value and totalBorrowed.value.",
      "Use spoke.id for userSupplies, userBorrows, spokeSummaryHistory, and spoke manager queries.",
    ],
    exampleCode: `async () => {
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const spoke = await aave.spoke({ query: { spokeId: spokes[0].id } });

  if (!spoke) {
    return null;
  }

  return {
    id: spoke.id,
    name: spoke.name,
    address: spoke.address,
    chainId: spoke.chain.chainId,
    totalSuppliedUsd: spoke.summary.totalSupplied.value,
    totalBorrowedUsd: spoke.summary.totalBorrowed.value,
    connectedHubs: spoke.summary.connectedHubs,
    uniqueAssets: spoke.summary.uniqueAssets,
  };
}`,
  },
  spokes: {
    description: "List spokes, commonly filtered by chain IDs.",
    signature: "aave.spokes(request, options?)",
    request: { query: { chainIds: [1] } },
    notes: [
      "Use the returned spoke.id for userSupplies, userBorrows, and other UserSpokeInput requests.",
      "Spoke summary totals are ExchangeAmount objects; use totalSupplied.value and totalBorrowed.value.",
    ],
    exampleCode: `async () => {
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  return spokes.map((spoke) => ({
    id: spoke.id,
    name: spoke.name,
    address: spoke.address,
    chainId: spoke.chain.chainId,
    totalSuppliedUsd: spoke.summary.totalSupplied.value,
    totalBorrowedUsd: spoke.summary.totalBorrowed.value,
  }));
}`,
  },
  spokeSummaryHistory: {
    description: "Fetch historical deposit and borrow samples for a spoke.",
    signature: "aave.spokeSummaryHistory(request)",
    request: {
      query: { spokeId: "spoke-id-from-aave.spokes" },
      currency: "USD",
      window: "LAST_WEEK",
    },
    notes: [
      "Use aave.spokes first to discover spoke.id.",
      "Samples use date, deposits, and borrows.",
    ],
    exampleCode: `async () => {
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const samples = await aave.spokeSummaryHistory({
    query: { spokeId: spokes[0].id },
    currency: "USD",
    window: "LAST_WEEK",
  });

  return samples.slice(0, 5).map((sample) => ({
    date: sample.date,
    depositsUsd: sample.deposits.value,
    borrowsUsd: sample.borrows.value,
  }));
}`,
  },
  spokePositionManagers: {
    description: "Fetch paginated position managers configured on a spoke.",
    signature: "aave.spokePositionManagers(request)",
    request: { spoke: "spoke-id-from-aave.spokes", pageSize: "TEN" },
    notes: [
      "This returns a paginated object with items and pageInfo, not an array.",
      "Use aave.spokes first to discover spoke.id.",
    ],
    exampleCode: `async () => {
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const managers = await aave.spokePositionManagers({
    spoke: spokes[0].id,
    pageSize: "TEN",
  });

  return {
    next: managers.pageInfo.next,
    items: managers.items.map((manager) => ({
      address: manager.address,
      name: manager.name,
      active: manager.active,
    })),
  };
}`,
  },
  spokeUserPositionManagers: {
    description: "Fetch paginated position managers for one user on one spoke.",
    signature: "aave.spokeUserPositionManagers(request)",
    request: {
      spoke: "spoke-id-from-aave.spokes",
      user: "0x...",
      pageSize: "TEN",
    },
    notes: [
      "This returns a paginated object with items and pageInfo, not an array.",
      "Empty items is a valid result when the user has no managers on that spoke.",
    ],
    exampleCode: `async () => {
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const managers = await aave.spokeUserPositionManagers({
    spoke: spokes[0].id,
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    pageSize: "TEN",
  });

  return {
    next: managers.pageInfo.next,
    items: managers.items.map((manager) => ({
      address: manager.address,
      name: manager.name,
      active: manager.active,
    })),
  };
}`,
  },
  reserves: {
    description: "List reserves for a spoke address and chain.",
    signature: "aave.reserves(request, options?)",
    request: {
      query: { spoke: { address: "0x...", chainId: 1 } },
      filter: "ALL",
    },
    notes: [
      "Do not use orderBy.name; the Aave GraphQL schema rejects that field.",
      "Reserve token symbols are at reserve.asset.underlying.info.symbol.",
    ],
    exampleCode: `async () => {
  const reserves = await aave.reserves({
    query: {
      spoke: {
        address: "0x973a023A77420ba610f06b3858aD991Df6d85A08",
        chainId: 1,
      },
    },
    filter: "ALL",
  });

  return reserves.map((reserve) => ({
    symbol: reserve.asset.underlying.info.symbol,
    suppliedUsd: reserve.summary.supplied.exchange.value,
    borrowedUsd: reserve.summary.borrowed.exchange.value,
  }));
}`,
  },
  reserve: {
    description: "Fetch one reserve by reserve id or reserve input.",
    signature: "aave.reserve(request, options?)",
    request: { query: { reserveId: "reserve-id-from-aave.reserves" } },
    notes: [
      "Use aave.reserves first to discover reserve.id.",
      "The request shape is { query: { reserveId } }, not { reserve: reserveId }.",
      "Reserve token symbols are at reserve.asset.underlying.info.symbol.",
    ],
    exampleCode: `async () => {
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const reserves = await aave.reserves({
    query: { spoke: { address: spokes[0].address, chainId: 1 } },
    filter: "ALL",
  });
  const reserve = await aave.reserve({
    query: { reserveId: reserves[0].id },
  });

  if (!reserve) {
    return null;
  }

  return {
    id: reserve.id,
    symbol: reserve.asset.underlying.info.symbol,
    suppliedUsd: reserve.summary.supplied.exchange.value,
    borrowedUsd: reserve.summary.borrowed.exchange.value,
    supplyApy: reserve.summary.supplyApy.normalized,
    borrowApy: reserve.summary.borrowApy.normalized,
  };
}`,
  },
  reserveHolders: {
    description: "Fetch paginated top holders for one reserve.",
    signature: "aave.reserveHolders(request, options?)",
    request: {
      reserve: { reserveId: "reserve-id-from-aave.reserves" },
      filter: "SUPPLIED",
      pageSize: "TEN",
    },
    notes: [
      "Use aave.reserves first to discover reserve.id.",
      "This returns a paginated object with items and pageInfo, not an array.",
      "Valid filters are SUPPLIED and BORROWED.",
    ],
    exampleCode: `async () => {
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const reserves = await aave.reserves({
    query: { spoke: { address: spokes[0].address, chainId: 1 } },
    filter: "ALL",
  });
  const holders = await aave.reserveHolders({
    reserve: { reserveId: reserves[0].id },
    filter: "SUPPLIED",
    pageSize: "TEN",
  });

  return {
    next: holders.pageInfo.next,
    items: holders.items.map((holder) => ({
      address: holder.address,
      amount: holder.amount.amount.value,
      usd: holder.amount.exchange.value,
      weight: holder.weight.normalized,
    })),
  };
}`,
  },
  supplyApyHistory: {
    description: "Fetch historical average supply APY samples for one reserve.",
    signature: "aave.supplyApyHistory(request)",
    request: {
      reserve: "reserve-id-from-aave.reserves",
      window: "LAST_WEEK",
    },
    notes: [
      "Use aave.reserves first to discover reserve.id.",
      "Samples use date and avgRate.normalized.",
    ],
    exampleCode: `async () => {
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const reserves = await aave.reserves({
    query: { spoke: { address: spokes[0].address, chainId: 1 } },
    filter: "ALL",
  });
  const samples = await aave.supplyApyHistory({
    reserve: reserves[0].id,
    window: "LAST_WEEK",
  });

  return samples.slice(0, 5).map((sample) => ({
    date: sample.date,
    supplyApy: sample.avgRate.normalized,
  }));
}`,
  },
  borrowApyHistory: {
    description: "Fetch historical average borrow APY samples for one reserve.",
    signature: "aave.borrowApyHistory(request)",
    request: {
      reserve: "reserve-id-from-aave.reserves",
      window: "LAST_WEEK",
    },
    notes: [
      "Use aave.reserves first to discover reserve.id.",
      "Samples use date and avgRate.normalized.",
    ],
    exampleCode: `async () => {
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const reserves = await aave.reserves({
    query: { spoke: { address: spokes[0].address, chainId: 1 } },
    filter: "ALL",
  });
  const samples = await aave.borrowApyHistory({
    reserve: reserves[0].id,
    window: "LAST_WEEK",
  });

  return samples.slice(0, 5).map((sample) => ({
    date: sample.date,
    borrowApy: sample.avgRate.normalized,
  }));
}`,
  },
  userPositions: {
    description: "List a user's positions across one or more chains.",
    signature: "aave.userPositions(request, options?)",
    request: {
      user: "0x...",
      filter: { chainIds: [1] },
      orderBy: { balance: "DESC" },
    },
    notes: [
      "Use this first when you only have a wallet address and need to discover active spokes/positions.",
      "Position objects expose healthFactor.current; userSummary exposes lowestHealthFactor.",
      "Position objects are aggregate summaries; use userSupplies or userBorrows with position.spoke.id for detailed reserve items.",
      "Position balance totals are ExchangeAmountWithChange objects; use totalSupplied.current.value and totalDebt.current.value.",
      "Full positions are nested; return a compact projection for agent-readable output.",
    ],
    exampleCode: `async () => {
  const positions = await aave.userPositions({
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    filter: { chainIds: [1] },
    orderBy: { balance: "DESC" },
  });

  return positions.map((position) => ({
    spoke: position.spoke.name,
    healthFactor: position.healthFactor.current,
    netBalanceUsd: position.netBalance.current.value,
    totalSuppliedUsd: position.totalSupplied.current.value,
    totalDebtUsd: position.totalDebt.current.value,
  }));
}`,
  },
  userPosition: {
    description: "Fetch one user position by user position id.",
    signature: "aave.userPosition(request, options?)",
    request: { id: "user-position-id-from-aave.userPositions" },
    notes: [
      "Use aave.userPositions first to discover position.id for a wallet.",
      "The request shape is { id: position.id }, not { userPositionId: position.id }.",
      "Position balance totals are ExchangeAmountWithChange objects; use netBalance.current.value, totalSupplied.current.value, and totalDebt.current.value.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const positions = await aave.userPositions({
    user,
    filter: { chainIds: [1] },
    orderBy: { balance: "DESC" },
  });
  const position = await aave.userPosition({ id: positions[0].id });

  if (!position) {
    return null;
  }

  return {
    id: position.id,
    spoke: position.spoke.name,
    healthFactor: position.healthFactor.current,
    netBalanceUsd: position.netBalance.current.value,
    totalSuppliedUsd: position.totalSupplied.current.value,
    totalDebtUsd: position.totalDebt.current.value,
  };
}`,
  },
  userSummary: {
    description: "Fetch a user's aggregate position summary.",
    signature: "aave.userSummary(request, options?)",
    request: {
      user: "0x...",
      filter: { spoke: { address: "0x...", chainId: 1 } },
    },
    notes: [
      "netBalance is an ExchangeAmountWithChange; use netBalance.current.value for the current USD value.",
      "totalSupplied, totalCollateral, totalDebt, and netAccruedInterest are ExchangeAmount objects with value fields.",
      "The health field is lowestHealthFactor, not healthFactor.",
    ],
    exampleCode: `async () => {
  const summary = await aave.userSummary({
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    filter: {
      spoke: {
        address: "0xbF10BDfE177dE0336aFD7fcCF80A904E15386219",
        chainId: 1,
      },
    },
  });

  return {
    netBalanceUsd: summary.netBalance.current.value,
    totalSuppliedUsd: summary.totalSupplied.value,
    totalDebtUsd: summary.totalDebt.value,
    netApy: summary.netApy.normalized,
    lowestHealthFactor: summary.lowestHealthFactor,
  };
}`,
  },
  userSummaryHistory: {
    description: "Fetch historical wallet summary samples.",
    signature: "aave.userSummaryHistory(request, options?)",
    request: {
      user: "0x...",
      window: "LAST_WEEK",
      filter: { chainIds: [1] },
    },
    notes: [
      "Samples use date, netBalance, borrows, supplies, and nullable healthFactor.",
      "Summary history values are ExchangeAmount objects; use netBalance.value, supplies.value, and borrows.value.",
      "healthFactor can be null for samples without an active borrow position.",
    ],
    exampleCode: `async () => {
  const samples = await aave.userSummaryHistory({
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    window: "LAST_WEEK",
    filter: { chainIds: [1] },
  });

  return samples.slice(0, 5).map((sample) => ({
    date: sample.date,
    netBalanceUsd: sample.netBalance.value,
    suppliesUsd: sample.supplies.value,
    borrowsUsd: sample.borrows.value,
    healthFactor: sample.healthFactor?.current ?? null,
  }));
}`,
  },
  userSupplies: {
    description: "Fetch a user's supply positions for a specific spoke.",
    signature: "aave.userSupplies(request, options?)",
    request: {
      query: {
        userSpoke: {
          spoke: "spoke-id-from-aave.spokes",
          user: "0x...",
        },
      },
    },
    notes: [
      "The spoke field is a GraphQL SpokeId string, not { address, chainId }.",
      "Do not use orderBy.name; the Aave GraphQL schema rejects that field.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const etherfi = spokes.find((spoke) => spoke.name === "Etherfi");
  const spoke = etherfi ?? spokes[0];

  if (!spoke) {
    return { note: "No spoke found on chain 1." };
  }

  const supplies = await aave.userSupplies({
    query: { userSpoke: { user, spoke: spoke.id } },
  });

  return supplies.map((supply) => ({
    symbol: supply.reserve.asset.underlying.info.symbol,
    balance: supply.balance.amount.value,
  }));
}`,
  },
  userBorrows: {
    description: "Fetch a user's borrow positions for a specific spoke.",
    signature: "aave.userBorrows(request, options?)",
    request: {
      query: {
        userSpoke: {
          spoke: "spoke-id-from-aave.spokes",
          user: "0x...",
        },
      },
    },
    notes: [
      "The spoke field is a GraphQL SpokeId string, not { address, chainId }.",
      "Do not use orderBy.name; the Aave GraphQL schema rejects that field.",
      "Borrow items expose debt, principal, and interest amounts; they do not have a balance field.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const etherfi = spokes.find((spoke) => spoke.name === "Etherfi");
  const spoke = etherfi ?? spokes[0];

  if (!spoke) {
    return { note: "No spoke found on chain 1." };
  }

  const borrows = await aave.userBorrows({
    query: { userSpoke: { user, spoke: spoke.id } },
  });

  return borrows.map((borrow) => ({
    symbol: borrow.reserve.asset.underlying.info.symbol,
    debt: borrow.debt.amount.value,
    debtUsd: borrow.debt.exchange.value,
  }));
}`,
  },
  userClaimableRewards: {
    description: "Fetch claimable rewards for one user on one chain.",
    signature: "aave.userClaimableRewards(request)",
    request: { user: "0x...", chainId: 1 },
    notes: [
      "Returns an array; an empty array is a valid result when the user has no claimable rewards.",
      "This is a read-only discovery action. Use claimRewards only to build an unsigned transaction request.",
    ],
    exampleCode: `async () => {
  const rewards = await aave.userClaimableRewards({
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    chainId: 1,
  });

  return rewards.map((reward) => ({
    id: reward.id,
    amount: reward.amount.amount.value,
    usd: reward.amount.exchange.value,
    token: reward.amount.token.info.symbol,
  }));
}`,
  },
  claimRewards: {
    description:
      "Build an unsigned transaction request to claim discovered rewards.",
    signature: "aave.claimRewards(request)",
    request: {
      ids: ["reward-id-from-aave.userClaimableRewards"],
      user: "0x...",
      chainId: 1,
    },
    notes: [
      "Call userClaimableRewards first and pass reward.id values.",
      "Returns a TransactionRequest; the MCP cannot sign or broadcast it.",
      "An empty userClaimableRewards result means there is nothing to claim.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const rewards = await aave.userClaimableRewards({ user, chainId: 1 });

  if (rewards.length === 0) {
    return { note: "No claimable rewards for this user." };
  }

  const transaction = await aave.claimRewards({
    ids: rewards.map((reward) => reward.id),
    user,
    chainId: 1,
  });

  return {
    to: transaction.to,
    value: transaction.value,
    operations: transaction.operations,
  };
}`,
  },
  supply: {
    description: "Build an execution plan for supplying to a reserve.",
    signature: "aave.supply(request)",
    request: {
      reserve: "reserve-id-from-aave.reserves",
      amount: { erc20: { value: "1" } },
      enableCollateral: true,
      sender: "0x...",
    },
    notes: [
      "reserve is a ReserveId returned by reserves.",
      "amount is one of { erc20: { value, permitSig? } } or { native: value }.",
      "enableCollateral is an AlwaysTrue field; omit it unless you want to enable collateral.",
      "Returns an ExecutionPlan such as TransactionRequest, Erc20ApprovalRequired, PreContractActionRequired, or InsufficientBalanceError.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const reserves = await aave.reserves({
    query: { spoke: { address: spokes[0].address, chainId: 1 } },
    filter: "ALL",
  });
  const reserve = reserves.find((item) => item.canSupply) ?? reserves[0];

  const plan = await aave.supply({
    reserve: reserve.id,
    amount: { erc20: { value: "1" } },
    enableCollateral: true,
    sender: user,
  });

  return { type: plan.__typename, keys: Object.keys(plan) };
}`,
  },
  borrow: {
    description: "Build an execution plan for borrowing from a reserve.",
    signature: "aave.borrow(request)",
    request: {
      reserve: "reserve-id-from-aave.reserves",
      amount: { erc20: { value: "1" } },
      sender: "0x...",
    },
    notes: [
      "reserve is a ReserveId returned by reserves.",
      "amount is one of { erc20: { value } } or { native: value }.",
      "The sender must have sufficient collateral and health factor for the generated plan to be usable.",
      "A 'Trying to borrow more than you are allowed to borrow' error is an account-state limit, not a request-shape failure.",
      "Returns an ExecutionPlan; inspect __typename before reading fields.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const reserves = await aave.reserves({
    query: { spoke: { address: spokes[0].address, chainId: 1 } },
    filter: "ALL",
  });
  const reserve = reserves.find((item) => item.canBorrow) ?? reserves[0];

  if (!reserve) {
    return { note: "No borrowable reserve found on chain 1." };
  }

  return {
    request: {
      reserve: reserve.id,
      amount: { erc20: { value: "0.000001" } },
      sender: user,
    },
    reserve: reserve.asset.underlying.info.symbol,
    note: "This wallet currently has no available borrowing power; use this request shape with a healthier sender.",
  };
}`,
  },
  repay: {
    description: "Build an execution plan for repaying debt.",
    signature: "aave.repay(request)",
    request: {
      reserve: "reserve-id-from-aave.userBorrows",
      amount: { erc20: { value: { exact: "1" } } },
      sender: "0x...",
    },
    notes: [
      "Use userBorrows to discover the debt reserve.",
      "Repay ERC-20 amount shape is { erc20: { value: { exact } } } or { erc20: { value: { max: true } } }.",
      "Native repay amount shape is { native: { exact } } or { native: { max: true } }.",
      "Returns an ExecutionPlan; insufficient wallet balance is a funding issue, not necessarily a request-shape issue.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const spokes = await aave.spokes({ query: { chainIds: [1] } });

  for (const spoke of spokes) {
    const borrows = await aave.userBorrows({
      query: { userSpoke: { user, spoke: spoke.id } },
    });
    const borrow = borrows.find((item) => Number(item.debt.amount.value) > 0);

    if (!borrow) {
      continue;
    }

    const plan = await aave.repay({
      reserve: borrow.reserve.id,
      amount: { erc20: { value: { exact: borrow.debt.amount.value } } },
      sender: user,
    });

    return { type: plan.__typename, keys: Object.keys(plan) };
  }

  return { note: "No borrow position found for this user." };
}`,
  },
  withdraw: {
    description: "Build an execution plan for withdrawing supplied funds.",
    signature: "aave.withdraw(request)",
    request: {
      reserve: "reserve-id-from-aave.userSupplies",
      amount: { erc20: { exact: "1" } },
      sender: "0x...",
    },
    notes: [
      "Use userSupplies to discover the supplied reserve.",
      "Withdraw amount is { erc20: { exact } }, { erc20: { max: true } }, { native: { exact } }, or { native: { max: true } }.",
      "Withdrawing collateral can fail if it would make the position unhealthy.",
      "Returns an ExecutionPlan; inspect __typename before reading fields.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const spokes = await aave.spokes({ query: { chainIds: [1] } });

  for (const spoke of spokes) {
    const supplies = await aave.userSupplies({
      query: { userSpoke: { user, spoke: spoke.id } },
    });
    const supply = supplies.find((item) => Number(item.balance.amount.value) > 0);

    if (!supply) {
      continue;
    }

    const plan = await aave.withdraw({
      reserve: supply.reserve.id,
      amount: { erc20: { exact: supply.balance.amount.value } },
      sender: user,
    });

    return { type: plan.__typename, keys: Object.keys(plan) };
  }

  return { note: "No supply position found for this user." };
}`,
  },
  setUserSuppliesAsCollateral: {
    description:
      "Build an unsigned transaction request to toggle supplied collateral.",
    signature: "aave.setUserSuppliesAsCollateral(request)",
    request: {
      changes: [
        {
          reserve: "reserve-id-from-aave.userSupplies",
          enableCollateral: false,
        },
      ],
      sender: "0x...",
    },
    notes: [
      "changes is an array of { reserve, enableCollateral }.",
      "reserve is the supplied reserve id; use userSupplies for discovery.",
      "Disabling collateral can fail if it would make the position unhealthy.",
      "Returns a TransactionRequest; the MCP cannot sign or broadcast it.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const positions = await aave.userPositions({
    user,
    filter: { chainIds: [1] },
    orderBy: { balance: "DESC" },
  });
  const position = positions[0];

  if (!position) {
    return { note: "No user position found for this user." };
  }

  const supplies = await aave.userSupplies({
    query: { userSpoke: { user, spoke: position.spoke.id } },
  });
  const supply = supplies.find((item) => Number(item.balance.amount.value) > 0);

  if (!supply) {
    return { note: "No supply position found for this user." };
  }

  const transaction = await aave.setUserSuppliesAsCollateral({
    changes: [{ reserve: supply.reserve.id, enableCollateral: false }],
    sender: user,
  });

  return { to: transaction.to, operations: transaction.operations };
}`,
  },
  updateUserPositionConditions: {
    description:
      "Build an unsigned transaction request to refresh a user's position conditions.",
    signature: "aave.updateUserPositionConditions(request)",
    request: {
      userPositionId: "user-position-id-from-aave.userPositions",
      update: "ALL_DYNAMIC_CONFIG",
    },
    notes: [
      "Use userPositions first to discover userPositionId.",
      "Valid update enum values are ALL_DYNAMIC_CONFIG and JUST_RISK_PREMIUM.",
      "Returns a TransactionRequest; the MCP cannot sign or broadcast it.",
    ],
    exampleCode: `async () => {
  const positions = await aave.userPositions({
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    filter: { chainIds: [1] },
    orderBy: { balance: "DESC" },
  });
  const position = positions[0];

  if (!position) {
    return { note: "No user position found." };
  }

  const transaction = await aave.updateUserPositionConditions({
    userPositionId: position.id,
    update: "ALL_DYNAMIC_CONFIG",
  });

  return { to: transaction.to, operations: transaction.operations };
}`,
  },
  setSpokeUserPositionManager: {
    description:
      "Build an unsigned transaction request to approve or remove a spoke position manager.",
    signature: "aave.setSpokeUserPositionManager(request)",
    request: {
      spoke: "spoke-id-from-aave.spokes",
      manager: "0x...",
      approve: true,
      user: "0x...",
      signature: { value: "0x...", deadline: 1_735_689_600 },
    },
    notes: [
      "spoke is a SpokeId string returned by spokes.",
      "signature is an externally signed ERC20PermitSignature-like authorization from the user.",
      "Omit signature only if the API path you are using does not require delegated authorization.",
      "Returns a TransactionRequest; the MCP cannot sign or broadcast it.",
    ],
    exampleCode: `async () => {
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const request = {
    spoke: spokes[0].id,
    manager: "0x0000000000000000000000000000000000000000",
    approve: true,
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    signature: { value: "0xexternal-signature", deadline: 1735689600 },
  };

  return {
    request,
    note: "Use a real manager address and externally signed user authorization before calling setSpokeUserPositionManager.",
  };
}`,
  },
  renounceSpokeUserPositionManager: {
    description:
      "Build an unsigned transaction request for a manager to renounce a managed user.",
    signature: "aave.renounceSpokeUserPositionManager(request)",
    request: {
      spoke: "spoke-id-from-aave.spokes",
      manager: "0x...",
      managing: "0x...",
    },
    notes: [
      "spoke is a SpokeId string returned by spokes.",
      "manager is the address renouncing permission; managing is the user address being managed.",
      "Returns a TransactionRequest; the MCP cannot sign or broadcast it.",
    ],
    exampleCode: `async () => {
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const request = {
    spoke: spokes[0].id,
    manager: "0x0000000000000000000000000000000000000000",
    managing: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
  };

  return {
    request,
    note: "Call renounceSpokeUserPositionManager only with a real managed user relationship.",
  };
}`,
  },
  liquidatePosition: {
    description:
      "Build an execution plan for liquidating an unhealthy user position.",
    signature: "aave.liquidatePosition(request)",
    request: {
      collateral: "collateral-reserve-id-from-aave.userPosition",
      debt: "debt-reserve-id-from-aave.userPosition",
      amount: { exact: { value: "1" } },
      liquidator: "0x...",
      user: "0x...",
      receiveShares: false,
    },
    notes: [
      "Use userPosition or activities to identify an unhealthy target position and its collateral/debt reserves.",
      "amount is { exact: { value, permitSig? } } or { max: true }.",
      "liquidator must hold the debt asset or provide a valid permit path.",
      "Returns an ExecutionPlan; inspect __typename before reading fields.",
    ],
    exampleCode: `async () => {
  const request = {
    collateral: "collateral-reserve-id-from-aave.userPosition",
    debt: "debt-reserve-id-from-aave.userPosition",
    amount: { exact: { value: "1" } },
    liquidator: "0x0000000000000000000000000000000000000000",
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    receiveShares: false,
  };

  return {
    request,
    note: "Replace placeholder reserve ids with collateral and debt reserve ids from an unhealthy position before calling liquidatePosition.",
  };
}`,
  },
  userRiskPremiumBreakdown: {
    description:
      "Fetch risk premium factor breakdown for a user position or user/spoke pair.",
    signature: "aave.userRiskPremiumBreakdown(request)",
    request: {
      query: { userPositionId: "user-position-id-from-aave.userPositions" },
      user: "0x...",
    },
    notes: [
      "Use aave.userPositions first to discover position.id, or use query.userSpoke with a spoke id from aave.spokes.",
      "Returns an array; an empty array is a valid result when there is no risk premium breakdown.",
      "Items expose token.info.symbol, collateral.normalized, currentRiskPremiumWeight.normalized, and latestRiskPremiumWeight.normalized.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const positions = await aave.userPositions({
    user,
    filter: { chainIds: [1] },
    orderBy: { balance: "DESC" },
  });
  const items = await aave.userRiskPremiumBreakdown({
    query: { userPositionId: positions[0].id },
    user,
  });

  return items.map((item) => ({
    symbol: item.token.info.symbol,
    collateral: item.collateral.normalized,
    currentRiskPremiumWeight: item.currentRiskPremiumWeight.normalized,
    latestRiskPremiumWeight: item.latestRiskPremiumWeight.normalized,
  }));
}`,
  },
  stableVaults: {
    description: "List stable vaults administered by an address.",
    signature: "aave.stableVaults(request, options?)",
    request: { admin: "0x..." },
    notes: [
      "The request field is admin, not adminAddress.",
      "Returns an array; an empty array is valid when the address administers no stable vaults.",
      "StableVault summary fields are scalar values such as summary.totalDeposits, summary.shares, and summary.userCount.",
      "StableVault rates expose rates.baseRate.normalized and rates.boostedRates[].apy.normalized.",
    ],
    exampleCode: `async () => {
  const vaults = await aave.stableVaults({
    admin: "0x0000000000000000000000000000000000000000",
  });

  return vaults.map((vault) => ({
    id: vault.id,
    name: vault.name,
    chainId: vault.chain.chainId,
    address: vault.address,
    baseRate: vault.rates.baseRate.normalized,
    totalDeposits: vault.summary.totalDeposits,
    userCount: vault.summary.userCount,
  }));
}`,
  },
  stableVault: {
    description: "Fetch one stable vault by stable vault id.",
    signature: "aave.stableVault(request, options?)",
    request: { id: "stable-vault-id-from-aave.stableVaults" },
    notes: [
      "Use aave.stableVaults first when you need to discover stable vault ids for an admin.",
      "Returns null when the id is unknown.",
      "StableVault summary fields are scalar values such as summary.totalDeposits, summary.shares, and summary.userCount.",
    ],
    exampleCode: `async () => {
  const vaults = await aave.stableVaults({
    admin: "0x0000000000000000000000000000000000000000",
  });

  if (!vaults[0]) {
    return null;
  }

  const vault = await aave.stableVault({ id: vaults[0].id });

  if (!vault) {
    return null;
  }

  return {
    id: vault.id,
    name: vault.name,
    chainId: vault.chain.chainId,
    baseRate: vault.rates.baseRate.normalized,
    totalDeposits: vault.summary.totalDeposits,
  };
}`,
  },
  stableVaultUserPositions: {
    description: "List a user's stable vault positions.",
    signature: "aave.stableVaultUserPositions(request, options?)",
    request: { user: "0x..." },
    notes: [
      "Use filter.vault.id when you need positions for one stable vault.",
      "Returns an array; an empty array is valid when the user has no stable vault positions.",
      "Position amount fields are DecimalNumber objects; use principal.value, interests.value, shares.value, and totalBalance.value.",
    ],
    exampleCode: `async () => {
  const positions = await aave.stableVaultUserPositions({
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
  });

  return positions.map((position) => ({
    vault: position.vault.name,
    chainId: position.vault.chain.chainId,
    apy: position.apy.normalized,
    boostedRateId: position.boostedRateId,
    principal: position.principal.value,
    interests: position.interests.value,
    totalBalance: position.totalBalance.value,
  }));
}`,
  },
  stableVaultMovements: {
    description:
      "Fetch paginated cross-chain fund movements for a stable vault.",
    signature: "aave.stableVaultMovements(request, options?)",
    request: {
      vaultId: "stable-vault-id-from-aave.stableVaults",
      pageSize: "TEN",
    },
    notes: [
      "Use aave.stableVaults first to discover vault.id for an admin address.",
      "This returns a paginated object with items and pageInfo, not an array.",
      "Movement items expose id, status, timestamp, txHash, and type. type is a union; inspect type.__typename before reading token fields.",
      "TokenMovementStatus values are PENDING and DONE.",
    ],
    exampleCode: `async () => {
  const vaults = await aave.stableVaults({
    admin: "0x0000000000000000000000000000000000000000",
  });

  if (!vaults[0]) {
    return { next: null, items: [] };
  }

  const movements = await aave.stableVaultMovements({
    vaultId: vaults[0].id,
    pageSize: "TEN",
  });

  return {
    next: movements.pageInfo.next,
    items: movements.items.map((movement) => ({
      id: movement.id,
      status: movement.status,
      timestamp: movement.timestamp,
      txHash: movement.txHash,
      type: movement.type.__typename,
    })),
  };
}`,
  },
  stableVaultRateUsers: {
    description:
      "Fetch paginated users assigned to a stable vault boosted rate.",
    signature: "aave.stableVaultRateUsers(request, options?)",
    request: {
      vaultId: "stable-vault-id-from-aave.stableVaults",
      rateId: "boosted-rate-id-from-stableVault.rates.boostedRates",
      pageSize: "TEN",
    },
    notes: [
      "Use aave.stableVaults or aave.stableVault first to discover vault.id and rates.boostedRates[].id.",
      "This returns a paginated object with address strings in items and pageInfo, not an array.",
      "Some vaults may have no boosted rates; handle that before calling stableVaultRateUsers.",
    ],
    exampleCode: `async () => {
  const vaults = await aave.stableVaults({
    admin: "0x0000000000000000000000000000000000000000",
  });
  const vault = vaults[0];
  const boostedRate = vault?.rates.boostedRates[0];

  if (!(vault && boostedRate)) {
    return { next: null, items: [] };
  }

  const users = await aave.stableVaultRateUsers({
    vaultId: vault.id,
    rateId: boostedRate.id,
    pageSize: "TEN",
  });

  return {
    next: users.pageInfo.next,
    items: users.items,
  };
}`,
  },
  stableVaultClaimStatus: {
    description: "Check a deferred stable vault withdrawal claim status.",
    signature: "aave.stableVaultClaimStatus(request, options?)",
    request: {
      claimId: "claim-id-from-aave.stableVaultWithdraw-deferred-claim",
    },
    notes: [
      "Use a claimId returned by stableVaultWithdraw when the withdraw result is a deferred StableVaultWithdrawClaim.",
      "Do not fabricate claim ids; malformed claim ids fail StableVaultWithdrawClaimId scalar parsing.",
      "Returns one of READY, PENDING, or UNKNOWN.",
      "This is read-only. stableVaultWithdrawRedeem builds the unsigned transaction request when a claim is ready.",
    ],
    exampleCode: `async () => {
  const claimId = "claim-id-from-aave.stableVaultWithdraw-deferred-claim";

  return {
    claimId,
    note: "Use a real claimId returned by a deferred stableVaultWithdraw result before calling stableVaultClaimStatus.",
  };
}`,
  },
  stableVaultAssignRate: {
    description:
      "Build an unsigned transaction request to assign users to a stable vault boosted rate.",
    signature: "aave.stableVaultAssignRate(request, options?)",
    request: {
      vaultId: "stable-vault-id-from-aave.stableVaults",
      rateId: "boosted-rate-id-from-stableVault.rates.boostedRates",
      users: ["0x..."],
    },
    notes: [
      "Use stableVaults or stableVault to discover vault.id and rates.boostedRates[].id.",
      "users is an array of EvmAddress strings.",
      "Returns a TransactionRequest; the MCP cannot sign or broadcast it.",
      "If a vault has no boostedRates, this action is not applicable.",
    ],
    exampleCode: `async () => {
  const vaults = await aave.stableVaults({
    admin: "0x0000000000000000000000000000000000000000",
  });
  const vault = vaults[0];
  const boostedRate = vault?.rates.boostedRates[0];

  if (!(vault && boostedRate)) {
    return { note: "No vault with a boosted rate found." };
  }

  const transaction = await aave.stableVaultAssignRate({
    vaultId: vault.id,
    rateId: boostedRate.id,
    users: ["0x94963B928498bE7f06637C3D57ea1E74D7f73423"],
  });

  return { to: transaction.to, operations: transaction.operations };
}`,
  },
  stableVaultUnassignRate: {
    description:
      "Build an unsigned transaction request to remove users from a stable vault boosted rate.",
    signature: "aave.stableVaultUnassignRate(request, options?)",
    request: {
      vaultId: "stable-vault-id-from-aave.stableVaults",
      rateId: "boosted-rate-id-from-stableVault.rates.boostedRates",
      users: ["0x..."],
    },
    notes: [
      "Use stableVaultRateUsers to discover users currently assigned to the boosted rate.",
      "vaultId is a StableVaultId and rateId is a BoostedRateId; do not pass vault addresses or rate names.",
      "Returns a TransactionRequest; the MCP cannot sign or broadcast it.",
    ],
    exampleCode: `async () => {
  const vaults = await aave.stableVaults({
    admin: "0x0000000000000000000000000000000000000000",
  });
  const vault = vaults[0];
  const boostedRate = vault?.rates.boostedRates[0];

  if (!(vault && boostedRate)) {
    return { note: "No vault with a boosted rate found." };
  }

  const users = await aave.stableVaultRateUsers({
    vaultId: vault.id,
    rateId: boostedRate.id,
    pageSize: "TEN",
  });

  if (!users.items[0]) {
    return { note: "No users assigned to this boosted rate." };
  }

  const transaction = await aave.stableVaultUnassignRate({
    vaultId: vault.id,
    rateId: boostedRate.id,
    users: [users.items[0]],
  });

  return { to: transaction.to, operations: transaction.operations };
}`,
  },
  stableVaultClaimSurplus: {
    description:
      "Build an unsigned transaction request to claim accumulated stable vault surplus.",
    signature: "aave.stableVaultClaimSurplus(request, options?)",
    request: {
      vaultId: "stable-vault-id-from-aave.stableVaults",
      claims: [{ address: "0x-token-address", value: "1" }],
    },
    notes: [
      "vaultId is a StableVaultId returned by stableVaults.",
      "claims is an array of SurplusClaim objects with token address and decimal value.",
      "Only vault admins should use this transaction builder.",
      "Returns a TransactionRequest; the MCP cannot sign or broadcast it.",
    ],
    exampleCode: `async () => {
  const request = {
    vaultId: "stable-vault-id-from-aave.stableVaults",
    claims: [{ address: "0x0000000000000000000000000000000000000000", value: "1" }],
  };

  return {
    request,
    note: "Use a real vault id and claim token address/value from vault admin accounting before calling stableVaultClaimSurplus.",
  };
}`,
  },
  stableVaultDeposit: {
    description: "Build an execution plan for depositing into a stable vault.",
    signature: "aave.stableVaultDeposit(request)",
    request: {
      vault: { id: "stable-vault-id-from-aave.stableVaults" },
      user: "0x...",
      amount: {
        address: "0x-token-address",
        value: { exact: "1" },
      },
    },
    notes: [
      "vault is { id }, not a bare vault id string.",
      "amount.address is the ERC-20 token address being deposited.",
      "amount.value is an AmountInput: { exact: decimalString } or { max: true }.",
      "Successful plans can be TransactionRequest or Erc20ApprovalRequired; insufficient wallet balance returns InsufficientBalanceError.",
    ],
    exampleCode: `async () => {
  const vaults = await aave.stableVaults({
    admin: "0x0000000000000000000000000000000000000000",
  });
  const vault = vaults[0];

  if (!vault) {
    return { note: "No stable vault found for this admin." };
  }

  const request = {
    vault: { id: vault.id },
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    amount: {
      address: "0x0000000000000000000000000000000000000000",
      value: { exact: "1" },
    },
  };

  return {
    request,
    note: "Replace amount.address with a real supported deposit token address before calling stableVaultDeposit.",
  };
}`,
  },
  stableVaultWithdraw: {
    description:
      "Build an execution plan for requesting a stable vault withdrawal.",
    signature: "aave.stableVaultWithdraw(request)",
    request: {
      vault: { id: "stable-vault-id-from-aave.stableVaults" },
      user: "0x...",
      amount: {
        address: "0x-token-address",
        value: { exact: "1" },
      },
    },
    notes: [
      "vault is { id }, not a bare vault id string.",
      "amount.address is the token address to withdraw.",
      "amount.value is an AmountInput: { exact: decimalString } or { max: true }.",
      "Result can be TransactionRequest for instant withdrawal or StableVaultWithdrawClaim for a deferred claim.",
      "Use stableVaultClaimStatus and stableVaultWithdrawRedeem for deferred claims.",
    ],
    exampleCode: `async () => {
  const positions = await aave.stableVaultUserPositions({
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
  });
  const position = positions[0];

  if (!position) {
    return { note: "No stable vault position found for this user." };
  }

  const request = {
    vault: { id: position.vault.id },
    user: position.user,
    amount: {
      address: position.vault.address,
      value: { exact: position.principal.value },
    },
  };

  return {
    request,
    note: "Use a supported token address for amount.address; vault.address is only a placeholder in this example.",
  };
}`,
  },
  stableVaultWithdrawRedeem: {
    description:
      "Build an execution plan to redeem a ready deferred stable vault withdrawal claim.",
    signature: "aave.stableVaultWithdrawRedeem(request)",
    request: { claimId: "claim-id-from-aave.stableVaultWithdraw" },
    notes: [
      "Use only with a real StableVaultWithdrawClaimId returned by stableVaultWithdraw.",
      "Call stableVaultClaimStatus or waitForStableVaultWithdrawClaim before redeeming.",
      "Result can be TransactionRequest or StableVaultPendingAvailability when funds are not ready.",
      "Malformed placeholder claim ids fail StableVaultWithdrawClaimId scalar parsing.",
    ],
    exampleCode: `async () => {
  const claimId = "claim-id-from-aave.stableVaultWithdraw";

  return {
    claimId,
    note: "Use a real claimId returned by stableVaultWithdraw before calling stableVaultWithdrawRedeem.",
  };
}`,
  },
  userBalances: {
    description:
      "Fetch a user's wallet balances for chains, tokens, a spoke, swappable tokens, or a user position.",
    signature: "aave.userBalances(request, options?)",
    request: {
      user: "0x...",
      filter: {
        chains: { chainIds: [1], byReservesType: "ALL" },
      },
    },
    notes: [
      "The chain filter is filter.chains.chainIds, not filter.chainIds.",
      "byReservesType defaults to ALL; valid values match ReservesRequestFilter such as ALL.",
      "Use includeZeroBalances: true only when you explicitly need zero rows.",
      "UserBalance rows expose token metadata at balance.info, total token amount at balance.totalAmount.value, and total USD value at balance.exchange.value.",
    ],
    exampleCode: `async () => {
  const balances = await aave.userBalances({
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    filter: { chains: { chainIds: [1], byReservesType: "ALL" } },
    orderBy: { balance: "DESC" },
  });

  return balances.slice(0, 10).map((balance) => ({
    symbol: balance.info.symbol,
    amount: balance.totalAmount.value,
    usd: balance.exchange.value,
  }));
}`,
  },
  swappableTokens: {
    description: "List tokens available for swaps on one or more chains.",
    signature: "aave.swappableTokens(request)",
    request: { query: { chainIds: [1] } },
    notes: [
      "Native tokens do not have address or isWrappedNativeToken fields; use optional chaining for those fields.",
    ],
    exampleCode: `async () => {
  const tokens = await aave.swappableTokens({ query: { chainIds: [1] } });
  return tokens.slice(0, 10).map((token) => ({
    symbol: token.info.symbol,
    name: token.info.name,
    chainId: token.chain.chainId,
    address: token.address ?? null,
    isWrappedNativeToken: token.isWrappedNativeToken ?? false,
  }));
}`,
  },
  tokenSwapQuote: {
    description: "Fetch a standalone token-to-token swap quote.",
    signature: "aave.tokenSwapQuote(request, options?)",
    request: {
      market: {
        chainId: 1,
        sell: { erc20: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
        buy: { erc20: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
        amount: "100",
        kind: "SELL",
        user: "0x...",
      },
    },
    notes: [
      "Use market for an immediate quote, limit for a limit-order quote, or fromQuote when refreshing an existing quote id.",
      "Token inputs use variants such as { erc20: address } or native chain tokens; do not include chainId inside sell.erc20 or buy.erc20.",
      "Use kind SELL when amount is the sell token amount; use BUY when amount is the desired buy token amount.",
      "Very small sell amounts can fail with a lower-than-fee error; increase amount before changing the request shape.",
      "Inspect __typename. Successful market quotes commonly return SwapByIntent with quote.quoteId.",
      "quote.costs.networkCosts is a single Erc20Amount, not an array.",
    ],
    exampleCode: `async () => {
  const quoteResult = await aave.tokenSwapQuote({
    market: {
      chainId: 1,
      sell: { erc20: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
      buy: { erc20: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
      amount: "100",
      kind: "SELL",
      user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    },
  });

  if (!("quote" in quoteResult)) {
    return {
      type: quoteResult.__typename,
      keys: Object.keys(quoteResult),
    };
  }

  const { quote } = quoteResult;

  return {
    type: quoteResult.__typename,
    quoteId: quote.quoteId,
    accuracy: quote.accuracy,
    sellSymbol: quote.sell.token.info.symbol,
    sellAmount: quote.sell.amount.value,
    buySymbol: quote.buy.token.info.symbol,
    buyAmount: quote.buy.amount.value,
    networkCostSymbol: quote.costs.networkCosts.token.info.symbol,
    networkCostAmount: quote.costs.networkCosts.amount.value,
    suggestedSlippage: quote.suggestedSlippage.normalized,
  };
}`,
  },
  prepareTokenSwap: {
    description: "Prepare typed data for executing a token swap quote.",
    signature: "aave.prepareTokenSwap(request)",
    request: { quoteId: "quote-id-from-aave.tokenSwapQuote" },
    notes: [
      "Call tokenSwapQuote first and pass quote.quoteId.",
      "The MCP can prepare typed data but cannot sign it or submit the swap.",
      "A correct quoteId can still fail with Insufficient balance when the user address does not hold enough sell token.",
      "Successful responses expose newQuoteId and data, where data is EIP-712 typed data for external signing.",
    ],
    exampleCode: `async () => {
  const quoteResult = await aave.tokenSwapQuote({
    market: {
      chainId: 1,
      sell: { erc20: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
      buy: { erc20: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" },
      amount: "100",
      kind: "SELL",
      user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    },
  });

  if (!("quote" in quoteResult)) {
    return {
      type: quoteResult.__typename,
      message: quoteResult.message ?? null,
      guidance: quoteResult.guidance ?? null,
    };
  }

  const prepared = await aave.prepareTokenSwap({
    quoteId: quoteResult.quote.quoteId,
  });

  if (prepared.__typename === "AaveSdkActionError") {
    return {
      type: prepared.__typename,
      message: prepared.message,
      guidance: prepared.guidance,
    };
  }

  return {
    type: prepared.__typename,
    newQuoteId: prepared.newQuoteId,
    typedDataDomain: prepared.data.domain,
    typedDataMessageKeys: Object.keys(prepared.data.message),
  };
}`,
  },
  supplySwapQuote: {
    description: "Fetch a quote for swapping an existing supplied position.",
    signature: "aave.supplySwapQuote(request, options?)",
    request: {
      market: {
        sellPosition: "user-supply-item-id-from-aave.userSupplies",
        buyReserve: "reserve-id-from-aave.reserves",
        amount: "1",
        user: "0x...",
        enableCollateral: true,
      },
    },
    notes: [
      "Use exactly one of market, limit, or fromQuote. market is the normal first quote path.",
      "market.sellPosition is a UserSupplyItemId from userSupplies, not a reserve id.",
      "market.buyReserve is a ReserveId from reserves.",
      "market.enableCollateral is required for supply swap market quotes.",
      "Successful responses are PositionSwapByIntentApprovalsRequired with quote and approvals.",
      "Refresh an existing quote with { fromQuote: { quoteId } }.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const spokes = await aave.spokes({ query: { chainIds: [1] } });

  for (const spoke of spokes) {
    const supplies = await aave.userSupplies({
      query: { userSpoke: { user, spoke: spoke.id } },
    });
    const sellPosition = supplies.find(
      (supply) => Number(supply.balance.amount.value) > 0
    );

    if (!sellPosition) {
      continue;
    }

    const reserves = await aave.reserves({
      query: { spoke: { address: spoke.address, chainId: spoke.chain.chainId } },
      filter: "ALL",
    });
    const buyReserve = reserves.find(
      (reserve) => reserve.id !== sellPosition.reserve.id && reserve.canSupply
    );

    if (!buyReserve) {
      continue;
    }

    const quoteResult = await aave.supplySwapQuote({
      market: {
        sellPosition: sellPosition.id,
        buyReserve: buyReserve.id,
        amount: sellPosition.balance.amount.value,
        user,
        enableCollateral: true,
      },
    });

    if (quoteResult.__typename === "AaveSdkActionError") {
      return {
        type: quoteResult.__typename,
        message: quoteResult.message,
        guidance: quoteResult.guidance,
      };
    }

    return {
      type: quoteResult.__typename,
      approvals: quoteResult.approvals.map((approval) => approval.__typename),
      quoteId: quoteResult.quote.quoteId,
      sellSymbol: quoteResult.quote.sell.token.info.symbol,
      buySymbol: quoteResult.quote.buy.token.info.symbol,
    };
  }

  return { error: "No eligible supply position and buy reserve found." };
}`,
  },
  borrowSwapQuote: {
    description: "Fetch a quote for swapping an existing debt position.",
    signature: "aave.borrowSwapQuote(request, options?)",
    request: {
      market: {
        debtPosition: "user-borrow-item-id-from-aave.userBorrows",
        buyReserve: "reserve-id-from-aave.reserves",
        amount: "1",
        user: "0x...",
      },
    },
    notes: [
      "Use exactly one of market, limit, or fromQuote. market is the normal first quote path.",
      "market.debtPosition is a UserBorrowItemId from userBorrows.",
      "market.buyReserve is a ReserveId from reserves.",
      "Successful responses are PositionSwapByIntentApprovalsRequired with quote and approvals.",
      "Refresh an existing quote with { fromQuote: { quoteId } }.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const spokes = await aave.spokes({ query: { chainIds: [1] } });

  for (const spoke of spokes) {
    const borrows = await aave.userBorrows({
      query: { userSpoke: { user, spoke: spoke.id } },
    });
    const debtPosition = borrows.find(
      (borrow) => Number(borrow.debt.amount.value) > 0
    );

    if (!debtPosition) {
      continue;
    }

    const reserves = await aave.reserves({
      query: { spoke: { address: spoke.address, chainId: spoke.chain.chainId } },
      filter: "ALL",
    });
    const buyReserve = reserves.find(
      (reserve) => reserve.id !== debtPosition.reserve.id && reserve.canBorrow
    );

    if (!buyReserve) {
      continue;
    }

    const quoteResult = await aave.borrowSwapQuote({
      market: {
        debtPosition: debtPosition.id,
        buyReserve: buyReserve.id,
        amount: debtPosition.debt.amount.value,
        user,
      },
    });

    if (quoteResult.__typename === "AaveSdkActionError") {
      return {
        type: quoteResult.__typename,
        message: quoteResult.message,
        guidance: quoteResult.guidance,
      };
    }

    return {
      type: quoteResult.__typename,
      approvals: quoteResult.approvals.map((approval) => approval.__typename),
      quoteId: quoteResult.quote.quoteId,
      sellSymbol: quoteResult.quote.sell.token.info.symbol,
      buySymbol: quoteResult.quote.buy.token.info.symbol,
    };
  }

  return { error: "No eligible debt position and buy reserve found." };
}`,
  },
  repayWithSupplyQuote: {
    description: "Fetch a quote for repaying debt with supplied collateral.",
    signature: "aave.repayWithSupplyQuote(request, options?)",
    request: {
      market: {
        debtPosition: "user-borrow-item-id-from-aave.userBorrows",
        repayWithReserve: "reserve-id-from-aave.reserves",
        amount: "1",
        user: "0x...",
      },
    },
    notes: [
      "Use exactly one of market, limit, or fromQuote. market is the normal first quote path.",
      "market.debtPosition is a UserBorrowItemId from userBorrows.",
      "market.repayWithReserve is a ReserveId for the supplied collateral token to spend.",
      "limit requests use repayPosition, repayAmount, supplyPosition, and supplyAmount.",
      "Successful responses are PositionSwapByIntentApprovalsRequired with quote and approvals.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const spokes = await aave.spokes({ query: { chainIds: [1] } });

  for (const spoke of spokes) {
    const [supplies, borrows] = await Promise.all([
      aave.userSupplies({ query: { userSpoke: { user, spoke: spoke.id } } }),
      aave.userBorrows({ query: { userSpoke: { user, spoke: spoke.id } } }),
    ]);
    const supply = supplies.find(
      (item) => Number(item.balance.amount.value) > 0
    );
    const debt = borrows.find((item) => Number(item.debt.amount.value) > 0);

    if (!(supply && debt)) {
      continue;
    }

    const quoteResult = await aave.repayWithSupplyQuote({
      market: {
        debtPosition: debt.id,
        repayWithReserve: supply.reserve.id,
        amount: debt.debt.amount.value,
        user,
      },
    });

    if (quoteResult.__typename === "AaveSdkActionError") {
      return {
        type: quoteResult.__typename,
        message: quoteResult.message,
        guidance: quoteResult.guidance,
      };
    }

    return {
      type: quoteResult.__typename,
      approvals: quoteResult.approvals.map((approval) => approval.__typename),
      quoteId: quoteResult.quote.quoteId,
      sellSymbol: quoteResult.quote.sell.token.info.symbol,
      buySymbol: quoteResult.quote.buy.token.info.symbol,
    };
  }

  return { error: "No eligible supply and debt positions found." };
}`,
  },
  withdrawSwapQuote: {
    description:
      "Fetch a quote for withdrawing a supplied position into another token.",
    signature: "aave.withdrawSwapQuote(request, options?)",
    request: {
      market: {
        sellPosition: "user-supply-item-id-from-aave.userSupplies",
        buyToken: { erc20: "0x..." },
        amount: "1",
        user: "0x...",
      },
    },
    notes: [
      "Use exactly one of market, limit, or fromQuote. market is the normal first quote path.",
      "market.sellPosition is a UserSupplyItemId from userSupplies; do not use position.",
      "market.buyToken is a TokenInput such as { erc20: address }, not a ReserveId.",
      "limit requests use withdrawPosition, withdrawAmount, buyToken, and buyAmount.",
      "Successful responses are PositionSwapByIntentApprovalsRequired with quote and approvals.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const spokes = await aave.spokes({ query: { chainIds: [1] } });

  for (const spoke of spokes) {
    const supplies = await aave.userSupplies({
      query: { userSpoke: { user, spoke: spoke.id } },
    });
    const sellPosition = supplies.find(
      (supply) => Number(supply.balance.amount.value) > 0
    );

    if (!sellPosition) {
      continue;
    }

    const reserves = await aave.reserves({
      query: { spoke: { address: spoke.address, chainId: spoke.chain.chainId } },
      filter: "ALL",
    });
    const buyReserve = reserves.find(
      (reserve) => reserve.id !== sellPosition.reserve.id
    );

    if (!buyReserve) {
      continue;
    }

    const quoteResult = await aave.withdrawSwapQuote({
      market: {
        sellPosition: sellPosition.id,
        buyToken: { erc20: buyReserve.asset.underlying.address },
        amount: sellPosition.balance.amount.value,
        user,
      },
    });

    if (quoteResult.__typename === "AaveSdkActionError") {
      return {
        type: quoteResult.__typename,
        message: quoteResult.message,
        guidance: quoteResult.guidance,
      };
    }

    return {
      type: quoteResult.__typename,
      approvals: quoteResult.approvals.map((approval) => approval.__typename),
      quoteId: quoteResult.quote.quoteId,
      sellSymbol: quoteResult.quote.sell.token.info.symbol,
      buySymbol: quoteResult.quote.buy.token.info.symbol,
    };
  }

  return { error: "No eligible supply position and buy token found." };
}`,
  },
  preparePositionSwap: {
    description: "Prepare typed data for executing a position swap quote.",
    signature: "aave.preparePositionSwap(request)",
    request: {
      quoteId: "quote-id-from-aave.supplySwapQuote",
      adapterContractSignature: "0x...",
      positionManagerSignature: "0x...",
      setCollateralSignature: "0x...",
    },
    notes: [
      "Call supplySwapQuote, borrowSwapQuote, repayWithSupplyQuote, or withdrawSwapQuote first and pass quote.quoteId.",
      "The MCP can prepare typed data but cannot sign EIP-712 data or submit the swap.",
      "Only include adapterContractSignature, positionManagerSignature, or setCollateralSignature after the corresponding approval typed data has been signed externally.",
      "Successful responses expose newQuoteId and data, where data is EIP-712 typed data for external signing.",
    ],
    exampleCode: `async () => {
  const quoteId = "quote-id-from-aave.supplySwapQuote";

  return {
    quoteId,
    note: "Use a real quote.quoteId and externally signed approval data before calling preparePositionSwap.",
  };
}`,
  },
  preview: {
    description:
      "Preview the position impact of a supply, borrow, repay, withdraw, collateral, or position-swap action.",
    signature: "aave.preview(request, options?)",
    request: {
      action: {
        supply: {
          reserve: "reserve-id-from-aave.reserves",
          amount: { erc20: { value: "1" } },
          sender: "0x...",
        },
      },
    },
    notes: [
      "action is a one-of object. Include exactly one nested action key.",
      "Supported keys include supply, borrow, repay, withdraw, setUserSuppliesAsCollateral, updateUserPositionConditions, supplySwap, borrowSwap, repayWithSupply, and withdrawSwap.",
      "Nested action request shapes are the same as the underlying action references.",
      "PreviewUserPosition exposes netBalance, netCollateral, remainingBorrowingPower, reserveRates, rewards, and healthFactor.",
    ],
    exampleCode: `async () => {
  const user = "0x94963B928498bE7f06637C3D57ea1E74D7f73423";
  const spokes = await aave.spokes({ query: { chainIds: [1] } });
  const reserves = await aave.reserves({
    query: { spoke: { address: spokes[0].address, chainId: 1 } },
    filter: "ALL",
  });
  const reserve = reserves.find((item) => item.canSupply) ?? reserves[0];

  const preview = await aave.preview({
    action: {
      supply: {
        reserve: reserve.id,
        amount: { erc20: { value: "1" } },
        sender: user,
      },
    },
  });

  return {
    id: preview.id,
    netBalanceBefore: preview.netBalance.current.value,
    netBalanceAfter: preview.netBalance.after.value,
    remainingBorrowingPowerAfter: preview.remainingBorrowingPower.after.value,
    healthFactorType: preview.healthFactor.__typename,
    supplyApyAfter: preview.reserveRates.supplyApy?.after.normalized ?? null,
  };
}`,
  },
  swapStatus: {
    description: "Fetch the current status for one swap id.",
    signature: "aave.swapStatus(request, options?)",
    request: { id: "swap-id-from-aave.userSwaps" },
    notes: [
      "Use userSwaps first to discover swap.swapId.",
      "Returns null when the swap id is unknown or unavailable.",
      "Final statuses include SwapFulfilled, SwapCancelled, and SwapExpired; open statuses include SwapOpen and SwapPendingSignature.",
    ],
    exampleCode: `async () => {
  const swaps = await aave.userSwaps({
    chainId: 1,
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    pageSize: "TEN",
  });

  if (!swaps.items[0]) {
    return null;
  }

  const status = await aave.swapStatus({ id: swaps.items[0].swapId });

  if (!status) {
    return null;
  }

  return {
    type: status.__typename,
    swapId: status.swapId,
    createdAt: status.createdAt,
  };
}`,
  },
  swap: {
    description: "Build the execution plan or receipt for a prepared swap.",
    signature: "aave.swap(request)",
    request: {
      intent: {
        quoteId: "quote-id-from-aave.prepareTokenSwap-or-preparePositionSwap",
        signature: "0x...",
      },
    },
    notes: [
      "Use exactly one of intent or transaction.",
      "intent requires quoteId plus an externally produced EIP-712 signature over the typed data returned by prepareTokenSwap or preparePositionSwap.",
      "transaction requires quoteId and can include permitSig for token swaps when applicable.",
      "The MCP cannot sign typed data, send transactions, or wait for on-chain receipts.",
      "Successful results are SwapReceipt or SwapTransactionRequest; inspect __typename before reading fields.",
    ],
    exampleCode: `async () => {
  const request = {
    intent: {
      quoteId: "quote-id-from-aave.prepareTokenSwap",
      signature: "0xexternal-signature",
    },
  };

  return {
    request,
    note: "Use real prepared quote ids and externally signed typed data before calling swap.",
  };
}`,
  },
  prepareSwapCancel: {
    description: "Prepare typed data for cancelling an open intent swap.",
    signature: "aave.prepareSwapCancel(request)",
    request: { id: "swap-id-from-aave.userSwaps-or-swapStatus" },
    notes: [
      "Use userSwaps or swapStatus to discover an open or pending swap id.",
      "This prepares EIP-712 typed data only; the MCP cannot sign it.",
      "Use cancelSwap with { intent: { id, signature } } after the typed data is signed externally.",
      "Transaction swaps can be cancelled with cancelSwap({ transaction: id }) when the API supports that path.",
    ],
    exampleCode: `async () => {
  const swaps = await aave.userSwaps({
    chainId: 1,
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    filterBy: ["OPEN", "PENDING_SIGNATURE"],
    pageSize: "TEN",
  });
  const swap = swaps.items[0];

  if (!swap) {
    return { note: "No open swap found for this user." };
  }

  const prepared = await aave.prepareSwapCancel({ id: swap.swapId });
  return {
    swapId: swap.swapId,
    typedDataDomain: prepared.data.domain,
    typedDataMessageKeys: Object.keys(prepared.data.message),
  };
}`,
  },
  cancelSwap: {
    description:
      "Build a swap cancellation request or return a cancellation receipt.",
    signature: "aave.cancelSwap(request)",
    request: {
      intent: {
        id: "swap-id-from-aave.userSwaps-or-swapStatus",
        signature: "0x...",
      },
    },
    notes: [
      "Use exactly one of intent or transaction.",
      "intent requires an externally signed signature from prepareSwapCancel typed data.",
      "transaction uses the swap id directly for transaction-style swaps.",
      "The MCP can inspect the returned plan but cannot sign or broadcast the transaction.",
      "Successful results can be TransactionRequest or SwapCancelled; inspect __typename first.",
    ],
    exampleCode: `async () => {
  const request = {
    intent: {
      id: "swap-id-from-aave.userSwaps",
      signature: "0xexternal-signature",
    },
  };

  return {
    request,
    note: "Use a real swap id and externally signed cancellation typed data before calling cancelSwap.",
  };
}`,
  },
  waitForSwapOutcome: {
    description:
      "Poll an already-created swap receipt until it reaches a final outcome.",
    signature: "aave.waitForSwapOutcome(receipt)",
    request: { swapId: "swap-id-from-aave.swap" },
    notes: [
      "Use only after swap returns a SwapReceipt. This helper expects the receipt object, not a plain swap id.",
      "Final outcomes are SwapFulfilled, SwapCancelled, and SwapExpired.",
      "For existing swap ids, prefer swapStatus because it accepts { id } directly.",
      "Polling can time out based on the SDK environment settings.",
    ],
    exampleCode: `async () => {
  const swaps = await aave.userSwaps({
    chainId: 1,
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    filterBy: ["FULFILLED", "CANCELLED", "EXPIRED"],
    pageSize: "TEN",
  });
  const swap = swaps.items[0];

  if (!swap) {
    return { note: "No final swap found for this user; use swapStatus for ids." };
  }

  const status = await aave.swapStatus({ id: swap.swapId });
  return {
    type: status?.__typename ?? null,
    swapId: swap.swapId,
    note: "waitForSwapOutcome needs a SwapReceipt returned by aave.swap, so swapStatus is safer for discovered ids.",
  };
}`,
  },
  waitForStableVaultWithdrawClaim: {
    description:
      "Poll a deferred stable vault withdrawal claim until it is ready.",
    signature: "aave.waitForStableVaultWithdrawClaim(request)",
    request: { claimId: "claim-id-from-aave.stableVaultWithdraw" },
    notes: [
      "Use only with a real StableVaultWithdrawClaimId returned by a deferred stableVaultWithdraw result.",
      "Do not fabricate claim ids; malformed ids fail StableVaultWithdrawClaimId scalar parsing.",
      "This resolves when stableVaultClaimStatus becomes READY or rejects with a timeout.",
      "After it resolves, call stableVaultWithdrawRedeem to build the unsigned redeem transaction.",
    ],
    exampleCode: `async () => {
  const claimId = "claim-id-from-aave.stableVaultWithdraw";

  return {
    claimId,
    note: "Use a real claimId returned by stableVaultWithdraw before calling waitForStableVaultWithdrawClaim.",
  };
}`,
  },
  userSwaps: {
    description: "Fetch a user's paginated swap history for a chain.",
    signature: "aave.userSwaps(request, options?)",
    request: {
      chainId: 1,
      user: "0x...",
      filterBy: ["FULFILLED", "OPEN"],
      pageSize: "TEN",
    },
    notes: [
      "This returns a paginated object with items and pageInfo, not an array.",
      "Empty items is a valid result when the user has no swap history for the requested statuses.",
      "Use SwapStatusFilter enum strings such as FULFILLED and OPEN.",
    ],
    exampleCode: `async () => {
  const swaps = await aave.userSwaps({
    chainId: 1,
    user: "0x94963B928498bE7f06637C3D57ea1E74D7f73423",
    filterBy: ["FULFILLED", "OPEN"],
    pageSize: "TEN",
  });

  return {
    next: swaps.pageInfo.next,
    items: swaps.items.map((swap) => ({
      type: swap.__typename,
      swapId: swap.swapId,
      createdAt: swap.createdAt,
    })),
  };
}`,
  },
  activities: {
    description: "Fetch paginated protocol/user activities.",
    signature: "aave.activities(request, options?)",
    request: {
      query: { chainIds: [1] },
      user: "0x...",
      types: ["SUPPLY", "BORROW", "WITHDRAW", "REPAY"],
    },
    notes: [
      "Activities return a paginated object with items and pageInfo, not an array.",
      "Always project or slice activity results; full items are deeply nested and may be truncated.",
    ],
    exampleCode: `async () => {
  const activities = await aave.activities({
    query: { chainIds: [1] },
    types: ["SUPPLY", "BORROW", "WITHDRAW", "REPAY"],
    pageSize: "TEN",
  });

  return {
    next: activities.pageInfo.next,
    items: activities.items.map((activity) => ({
      type: activity.__typename,
      user: activity.user,
      timestamp: activity.timestamp,
      txHash: activity.txHash,
    })),
  };
}`,
  },
};

const SDK_ACTION_NAME_SET = new Set<string>(AAVE_SDK_ACTION_NAMES);

const SCALAR_NOTES = {
  ChainId: "Use a number, for example 1.",
  EvmAddress: "Use a 0x-prefixed address string.",
  BigDecimal: 'Use a decimal string, for example "100.5".',
  SpokeId:
    "Use the opaque id returned by aave.spokes for UserSpokeInput requests, not a spoke address object.",
  enums:
    "Use GraphQL enum strings shown in examples, for example ALL, ASC, DESC, USD, LAST_DAY.",
} as const;

const USAGE_NOTES = [
  "Call get_aave_sdk_reference for the action before executing code.",
  "Prefer compact JSON returns: map large SDK objects to the fields you need and slice paginated lists.",
  "If you only have a wallet address, start with userPositions or activities; if you need a spoke-specific query, discover the spoke id with spokes first.",
  "The MCP has no wallet or signer. Transaction actions can at most build execution plans or transaction requests; they cannot sign or broadcast transactions.",
  "The sandbox code must be a single async arrow function, for example async () => { ... }.",
] as const;

const CATEGORY_BY_ACTION = {
  ...Object.fromEntries(READ_ONLY_ACTIONS.map((name) => [name, "read"])),
  ...Object.fromEntries(
    QUOTE_AND_PREVIEW_ACTIONS.map((name) => [name, "quote"])
  ),
  ...Object.fromEntries(
    TRANSACTION_ACTIONS.map((name) => [name, "transaction"])
  ),
  ...Object.fromEntries(POLLING_ACTIONS.map((name) => [name, "polling"])),
} as Record<AaveSdkActionName, ActionCategory>;

export const AAVE_SDK_ACTION_CATEGORIES = {
  readOnly: READ_ONLY_ACTIONS,
  quoteAndPreview: QUOTE_AND_PREVIEW_ACTIONS,
  transaction: TRANSACTION_ACTIONS,
  polling: POLLING_ACTIONS,
} as const;

const CATEGORY_GUIDANCE = {
  read: "Read-only query action. Prefer this category for analysis and discovery tasks.",
  quote:
    "Quote or preview action. It is read-like but usually needs precise user, reserve/token, amount, and chain context; call read-only discovery actions first.",
  transaction:
    "Transaction-building action. The MCP has no signer, so use it only to inspect an unsigned execution plan or transaction request, not to perform a transaction.",
  polling:
    "Polling helper. Use only after you already have a swap id or stable-vault withdrawal claim id from a previous action.",
} as const satisfies Record<ActionCategory, string>;

const fallbackReferenceForAction = (
  action: AaveSdkActionName
): Record<string, unknown> => {
  const category = CATEGORY_BY_ACTION[action];

  return {
    description: "No curated example yet for this action.",
    signature: `aave.${action}(request, options?)`,
    category,
    guidance: CATEGORY_GUIDANCE[category],
    nextSteps: [
      "Use get_aave_sdk_types for broad scalar and option names.",
      "Use a nearby curated reference for the request family, then inspect Object.keys(...) on compact responses.",
      "Return a compact projection and avoid full nested SDK objects.",
    ],
  };
};

export const getAaveSdkActionToolDescription = (
  action: AaveSdkActionName
): string => {
  const reference =
    COMMON_REFERENCES[action] ?? fallbackReferenceForAction(action);
  const description =
    typeof reference.description === "string"
      ? reference.description
      : `Call @aave/client/actions ${action}.`;
  const signature =
    typeof reference.signature === "string"
      ? reference.signature
      : `aave.${action}(request, options?)`;
  const request =
    "request" in reference ? JSON.stringify(reference.request) : "{}";
  const notes = Array.isArray(reference.notes)
    ? reference.notes.slice(0, 3).join(" ")
    : CATEGORY_GUIDANCE[CATEGORY_BY_ACTION[action]];

  return [
    description,
    `Signature: ${signature}.`,
    `Request shape: ${request}.`,
    notes,
    "Return compact JSON projections; do not return full nested SDK objects.",
  ].join(" ");
};

export const isAaveSdkActionName = (
  value: string
): value is AaveSdkActionName => {
  return SDK_ACTION_NAME_SET.has(value);
};

const getReferenceManifest = (): Record<
  AaveSdkActionName,
  {
    category: ActionCategory;
    description: string;
    signature: string;
    referenceToolCall: string;
  }
> => {
  return Object.fromEntries(
    AAVE_SDK_ACTION_NAMES.map((name) => {
      const reference =
        COMMON_REFERENCES[name] ?? fallbackReferenceForAction(name);
      const description =
        typeof reference.description === "string"
          ? reference.description
          : `Call @aave/client/actions ${name}.`;
      const signature =
        typeof reference.signature === "string"
          ? reference.signature
          : `aave.${name}(request, options?)`;

      return [
        name,
        {
          category: CATEGORY_BY_ACTION[name],
          description,
          signature,
          referenceToolCall: `get_aave_sdk_reference({ action: "${name}" })`,
        },
      ];
    })
  ) as Record<
    AaveSdkActionName,
    {
      category: ActionCategory;
      description: string;
      signature: string;
      referenceToolCall: string;
    }
  >;
};

export const getAaveSdkReference = (
  action?: AaveSdkActionName
): Record<string, unknown> => {
  if (action) {
    return {
      action,
      category: CATEGORY_BY_ACTION[action],
      categoryGuidance: CATEGORY_GUIDANCE[CATEGORY_BY_ACTION[action]],
      reference:
        COMMON_REFERENCES[action] ?? fallbackReferenceForAction(action),
      scalarNotes: SCALAR_NOTES,
      usageNotes: USAGE_NOTES,
    };
  }

  return {
    package: `@aave/client@${AAVE_CLIENT_VERSION}`,
    endpoint: AAVE_V4_GRAPHQL_URL,
    actions: AAVE_SDK_ACTION_NAMES,
    actionCategories: AAVE_SDK_ACTION_CATEGORIES,
    referenceManifest: getReferenceManifest(),
    scalarNotes: SCALAR_NOTES,
    usageNotes: USAGE_NOTES,
    nextStep:
      "Call get_aave_sdk_reference with an action to fetch the exact request shape, notes, and compact executable example.",
  };
};
