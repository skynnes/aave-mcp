import { describe, expect, it } from "bun:test";
import {
  AAVE_SDK_ACTION_CATEGORIES,
  AAVE_SDK_ACTION_NAMES,
  AAVE_SDK_TYPES,
  COMMON_REFERENCES,
  getAaveSdkActionToolDescription,
  getAaveSdkReference,
} from "../src/aave-sdk-reference";
import {
  hasCatchClause,
  hasObviousNonTerminatingLoop,
  isAsyncArrowFunctionCode,
  stripTypeScriptSyntax,
} from "../src/code-sanitizer";
import { addAaveSdkErrorGuidance } from "../src/error-guidance";
import {
  invalidToolCallParamsMessage,
  missingCodeArgumentMessage,
  unknownAaveActionMessage,
  unknownToolMessage,
} from "../src/mcp-guidance";
import {
  invalidRequestMessage,
  methodNotFoundMessage,
  parseErrorMessage,
  postOnlyMessage,
} from "../src/protocol-guidance";
import { truncateResponse } from "../src/response-serializer";

describe("stripTypeScriptSyntax", () => {
  it("preserves object literal fields in Aave request shapes", () => {
    const code = stripTypeScriptSyntax(
      "async () => await aave.reserves({ query: { spoke: { address: '0xabc', chainId: 1 } }, filter: 'ALL' })"
    );

    expect(code).toContain("address: '0xabc'");
    expect(code).toContain("chainId: 1");
    expect(code).toContain("filter: 'ALL'");
  });

  it("strips arrow parameter and return types", () => {
    const code = stripTypeScriptSyntax(
      "async (): Promise<unknown> => { const pick = (chain: unknown = null): unknown => chain; return pick(null); }"
    );

    expect(code).toContain("async ()=>");
    expect(code).toContain("(chain= null)=>");
    expect(code).not.toContain(": unknown");
    expect(code).not.toContain("Promise<unknown>");
  });

  it("strips as assertions without changing string literals", () => {
    const code = stripTypeScriptSyntax(
      "async () => { const label = 'keep this as literal text'; const value = ({ chainId: 1 } as { chainId: number }); return { label, value }; }"
    );

    expect(code).toContain("'keep this as literal text'");
    expect(code).toContain("({ chainId: 1 })");
    expect(code).not.toContain("as {");
  });

  it("strips satisfies operators without changing string literals", () => {
    const code = stripTypeScriptSyntax(
      "async () => { const text = 'do not alter satisfies inside strings'; const request = { query: { filter: 'ALL' } } satisfies { query: { filter: string } }; return { text, request }; }"
    );

    expect(code).toContain("'do not alter satisfies inside strings'");
    expect(code).toContain("const request = { query: { filter: 'ALL' } }");
    expect(code).not.toContain("} satisfies");
  });

  it("recognizes only async arrow function snippets as executable", () => {
    expect(
      isAsyncArrowFunctionCode(
        "async () => await aave.chains({ query: { filter: 'ALL' } })"
      )
    ).toBe(true);
    expect(isAsyncArrowFunctionCode("async (): Promise<unknown> => null")).toBe(
      true
    );
    expect(
      isAsyncArrowFunctionCode(
        "await aave.chains({ query: { filter: 'ALL' } })"
      )
    ).toBe(false);
    expect(isAsyncArrowFunctionCode("function run() { return null; }")).toBe(
      false
    );
  });

  it("rejects async arrow snippets with trailing executable statements", () => {
    expect(
      isAsyncArrowFunctionCode(
        "async () => ({ ok: true }); throw new Error('injected')"
      )
    ).toBe(false);
    expect(
      isAsyncArrowFunctionCode(
        "async () => { return { ok: true }; }; await aave.chains({ query: { filter: 'ALL' } })"
      )
    ).toBe(false);
    expect(
      isAsyncArrowFunctionCode("async () => ({ text: '; is inside text' });")
    ).toBe(true);
  });

  it("ignores comments while detecting snippet boundaries and catch clauses", () => {
    expect(
      isAsyncArrowFunctionCode(
        "/* lead */ async () => { return { ok: true }; } // trailing"
      )
    ).toBe(true);
    expect(
      hasCatchClause("async () => { /* catch is a comment */ return null; }")
    ).toBe(false);
  });

  it("accepts fenced TypeScript snippets", () => {
    const code = stripTypeScriptSyntax(`\`\`\`ts
async (): Promise<unknown> => {
  const chains = await aave.chains({ query: { filter: "ALL" as const } });
  return chains.map((chain: unknown) => chain);
}
\`\`\``);

    expect(isAsyncArrowFunctionCode(code)).toBe(true);
    expect(code).not.toContain("```");
    expect(code).not.toContain("Promise<unknown>");
    expect(code).not.toContain("as const");
  });

  it("detects catch clauses without matching string literals", () => {
    expect(
      hasCatchClause(
        "async () => { try { return await aave.chains({ query: { filter: 'ALL' } }); } catch (error) { return String(error); } }"
      )
    ).toBe(true);
    expect(hasCatchClause("async () => ({ text: 'catch is just text' })")).toBe(
      false
    );
  });

  it("detects obvious non-terminating loops without matching strings", () => {
    expect(
      hasObviousNonTerminatingLoop("async () => { while (true) {} }")
    ).toBe(true);
    expect(hasObviousNonTerminatingLoop("async () => { for (;;) {} }")).toBe(
      true
    );
    expect(
      hasObviousNonTerminatingLoop("async () => 'while (true) is just text'")
    ).toBe(false);
  });
});

describe("getAaveSdkReference", () => {
  it("keeps curated examples executable as async arrow functions", () => {
    for (const reference of Object.values(COMMON_REFERENCES)) {
      if (typeof reference.exampleCode !== "string") {
        continue;
      }

      expect(isAsyncArrowFunctionCode(reference.exampleCode)).toBe(true);
      expect(hasCatchClause(reference.exampleCode)).toBe(false);
    }
  });

  it("documents spoke id discovery for user spoke queries", () => {
    const suppliesReference = getAaveSdkReference("userSupplies");
    const borrowsReference = getAaveSdkReference("userBorrows");
    const spokeReference = getAaveSdkReference("spoke");
    const spokesReference = getAaveSdkReference("spokes");
    const spokeSummaryHistoryReference = getAaveSdkReference(
      "spokeSummaryHistory"
    );
    const spokePositionManagersReference = getAaveSdkReference(
      "spokePositionManagers"
    );
    const spokeUserPositionManagersReference = getAaveSdkReference(
      "spokeUserPositionManagers"
    );
    const serialized = JSON.stringify([
      suppliesReference,
      borrowsReference,
      spokeReference,
      spokesReference,
      spokeSummaryHistoryReference,
      spokePositionManagersReference,
      spokeUserPositionManagersReference,
    ]);

    expect(serialized).toContain("SpokeId string");
    expect(serialized).toContain("not { address, chainId }");
    expect(serialized).toContain("aave.spokes");
    expect(serialized).toContain("Do not use orderBy.name");
    expect(serialized).toContain("spoke.summary.totalSupplied.value");
    expect(serialized).toContain("sample.deposits.value");
    expect(serialized).toContain("paginated object with items and pageInfo");
    expect(serialized).toContain("Empty items is a valid result");
  });

  it("documents compact result handling for large responses", () => {
    const activitiesReference = getAaveSdkReference("activities");
    const reservesReference = getAaveSdkReference("reserves");
    const reserveHoldersReference = getAaveSdkReference("reserveHolders");
    const allReferences = getAaveSdkReference();
    const serialized = JSON.stringify([
      activitiesReference,
      reservesReference,
      reserveHoldersReference,
      allReferences,
    ]);

    expect(serialized).toContain("compact JSON returns");
    expect(serialized).toContain("full items are deeply nested");
    expect(serialized).toContain("Reserve token symbols");
    expect(serialized).toContain("paginated object with items and pageInfo");
  });

  it("keeps the all-actions reference overview below the MCP truncation limit", () => {
    const allReferences = getAaveSdkReference();
    const manifest = allReferences.referenceManifest as Record<
      string,
      { referenceToolCall?: string }
    >;
    const serialized = JSON.stringify(allReferences, null, 2);

    expect(serialized.length).toBeLessThan(45_000);
    expect(serialized).toContain("referenceManifest");
    expect(manifest.supply?.referenceToolCall).toBe(
      'get_aave_sdk_reference({ action: "supply" })'
    );
    expect(serialized).not.toContain("commonReferences");
  });

  it("documents reserve lookup, holder, and APY history shapes", () => {
    const reserveReference = getAaveSdkReference("reserve");
    const reserveHoldersReference = getAaveSdkReference("reserveHolders");
    const supplyApyReference = getAaveSdkReference("supplyApyHistory");
    const borrowApyReference = getAaveSdkReference("borrowApyHistory");
    const serialized = JSON.stringify([
      reserveReference,
      reserveHoldersReference,
      supplyApyReference,
      borrowApyReference,
    ]);

    expect(serialized).toContain("reserve-id-from-aave.reserves");
    expect(serialized).toContain("{ query: { reserveId } }");
    expect(serialized).toContain("not { reserve: reserveId }");
    expect(serialized).toContain("SUPPLIED");
    expect(serialized).toContain("BORROWED");
    expect(serialized).toContain("holder.amount.exchange.value");
    expect(serialized).toContain("avgRate.normalized");
  });

  it("documents user summary field names that are easy to guess wrong", () => {
    const summaryReference = getAaveSdkReference("userSummary");
    const serialized = JSON.stringify(summaryReference);

    expect(serialized).toContain("netBalance.current.value");
    expect(serialized).toContain("lowestHealthFactor");
    expect(serialized).toContain("not healthFactor");
    expect(serialized).toContain("totalDebt.value");
  });

  it("documents user positions as the wallet-first discovery path", () => {
    const positionsReference = getAaveSdkReference("userPositions");
    const positionReference = getAaveSdkReference("userPosition");
    const serialized = JSON.stringify([positionsReference, positionReference]);

    expect(serialized).toContain("Use this first");
    expect(serialized).toContain("orderBy");
    expect(serialized).toContain("healthFactor.current");
    expect(serialized).toContain("netBalance.current.value");
    expect(serialized).toContain("totalDebt.current.value");
    expect(serialized).toContain("use userSupplies or userBorrows");
    expect(serialized).toContain("user-position-id-from-aave.userPositions");
    expect(serialized).toContain("not { userPositionId: position.id }");
    expect(serialized).not.toContain("positions[0]?.supplies");
    expect(serialized).not.toContain("positions[0]?.borrows");
  });

  it("documents user summary history sample shapes", () => {
    const summaryHistoryReference = getAaveSdkReference("userSummaryHistory");
    const serialized = JSON.stringify(summaryHistoryReference);

    expect(serialized).toContain("sample.netBalance.value");
    expect(serialized).toContain("sample.healthFactor?.current ?? null");
    expect(serialized).toContain("healthFactor can be null");
    expect(serialized).toContain("filter");
  });

  it("documents claimable rewards as read-only and possibly empty", () => {
    const rewardsReference = getAaveSdkReference("userClaimableRewards");
    const serialized = JSON.stringify(rewardsReference);

    expect(serialized).toContain("empty array is a valid result");
    expect(serialized).toContain("claimRewards only to build");
    expect(serialized).toContain("reward.amount.exchange.value");
  });

  it("documents risk premium breakdown request and item shapes", () => {
    const riskPremiumReference = getAaveSdkReference(
      "userRiskPremiumBreakdown"
    );
    const serialized = JSON.stringify(riskPremiumReference);

    expect(serialized).toContain("user-position-id-from-aave.userPositions");
    expect(serialized).toContain("query.userSpoke");
    expect(serialized).toContain("empty array is a valid result");
    expect(serialized).toContain("currentRiskPremiumWeight.normalized");
  });

  it("documents stable vault read request shapes", () => {
    const vaultsReference = getAaveSdkReference("stableVaults");
    const vaultReference = getAaveSdkReference("stableVault");
    const positionsReference = getAaveSdkReference("stableVaultUserPositions");
    const movementsReference = getAaveSdkReference("stableVaultMovements");
    const rateUsersReference = getAaveSdkReference("stableVaultRateUsers");
    const claimStatusReference = getAaveSdkReference("stableVaultClaimStatus");
    const serialized = JSON.stringify([
      vaultsReference,
      vaultReference,
      positionsReference,
      movementsReference,
      rateUsersReference,
      claimStatusReference,
    ]);

    expect(serialized).toContain("admin, not adminAddress");
    expect(serialized).toContain("empty array is valid");
    expect(serialized).toContain("summary.totalDeposits");
    expect(serialized).toContain("rates.baseRate.normalized");
    expect(serialized).toContain("principal.value");
    expect(serialized).toContain("stable-vault-id-from-aave.stableVaults");
    expect(serialized).toContain("boosted-rate-id");
    expect(serialized).toContain("TokenMovementStatus");
    expect(serialized).toContain("StableVaultWithdrawClaimId");
  });

  it("documents swap history and transaction status enum pitfalls", () => {
    const swapsReference = getAaveSdkReference("userSwaps");
    const swapStatusReference = getAaveSdkReference("swapStatus");
    const txStatusReference = getAaveSdkReference(
      "hasProcessedKnownTransaction"
    );
    const serialized = JSON.stringify([
      swapsReference,
      swapStatusReference,
      txStatusReference,
    ]);

    expect(serialized).toContain("pageInfo");
    expect(serialized).toContain("SwapStatusFilter");
    expect(serialized).toContain("swap.swapId");
    expect(serialized).toContain("aave.swapStatus");
    expect(serialized).toContain("Returns null");
    expect(serialized).toContain("SPOKE_SUPPLY");
    expect(serialized).toContain("Do not use activity type names");
  });

  it("documents swap execution, cancellation, and polling boundaries", () => {
    const swapReference = getAaveSdkReference("swap");
    const prepareCancelReference = getAaveSdkReference("prepareSwapCancel");
    const cancelReference = getAaveSdkReference("cancelSwap");
    const waitSwapReference = getAaveSdkReference("waitForSwapOutcome");
    const waitClaimReference = getAaveSdkReference(
      "waitForStableVaultWithdrawClaim"
    );
    const serialized = JSON.stringify([
      swapReference,
      prepareCancelReference,
      cancelReference,
      waitSwapReference,
      waitClaimReference,
    ]);

    expect(serialized).toContain("intent or transaction");
    expect(serialized).toContain("externally signed");
    expect(serialized).toContain("prepareSwapCancel");
    expect(serialized).toContain("SwapReceipt");
    expect(serialized).toContain("not a plain swap id");
    expect(serialized).toContain("StableVaultWithdrawClaimId");
    expect(serialized).toContain("stableVaultWithdrawRedeem");
  });

  it("documents core transaction builder request shapes", () => {
    const supplyReference = getAaveSdkReference("supply");
    const borrowReference = getAaveSdkReference("borrow");
    const repayReference = getAaveSdkReference("repay");
    const withdrawReference = getAaveSdkReference("withdraw");
    const claimReference = getAaveSdkReference("claimRewards");
    const collateralReference = getAaveSdkReference(
      "setUserSuppliesAsCollateral"
    );
    const updateConditionsReference = getAaveSdkReference(
      "updateUserPositionConditions"
    );
    const setManagerReference = getAaveSdkReference(
      "setSpokeUserPositionManager"
    );
    const renounceManagerReference = getAaveSdkReference(
      "renounceSpokeUserPositionManager"
    );
    const liquidationReference = getAaveSdkReference("liquidatePosition");
    const serialized = JSON.stringify([
      supplyReference,
      borrowReference,
      repayReference,
      withdrawReference,
      claimReference,
      collateralReference,
      updateConditionsReference,
      setManagerReference,
      renounceManagerReference,
      liquidationReference,
    ]);

    expect(serialized).toContain("ExecutionPlan");
    expect(serialized).toContain("Erc20ApprovalRequired");
    expect(serialized).toContain("enableCollateral");
    expect(serialized).toContain("account-state limit");
    expect(serialized).toContain("available borrowing power");
    expect(serialized).toContain("value: { exact");
    expect(serialized).toContain("erc20: { exact");
    expect(serialized).toContain("reward.id");
    expect(serialized).toContain("cannot sign or broadcast");
    expect(serialized).toContain("ALL_DYNAMIC_CONFIG");
    expect(serialized).toContain("JUST_RISK_PREMIUM");
    expect(serialized).toContain("externally signed");
    expect(serialized).toContain("managing");
    expect(serialized).toContain("receiveShares");
  });

  it("documents stable vault write request shapes", () => {
    const assignReference = getAaveSdkReference("stableVaultAssignRate");
    const unassignReference = getAaveSdkReference("stableVaultUnassignRate");
    const claimSurplusReference = getAaveSdkReference(
      "stableVaultClaimSurplus"
    );
    const depositReference = getAaveSdkReference("stableVaultDeposit");
    const withdrawReference = getAaveSdkReference("stableVaultWithdraw");
    const redeemReference = getAaveSdkReference("stableVaultWithdrawRedeem");
    const serialized = JSON.stringify([
      assignReference,
      unassignReference,
      claimSurplusReference,
      depositReference,
      withdrawReference,
      redeemReference,
    ]);

    expect(serialized).toContain("BoostedRateId");
    expect(serialized).toContain("StableVaultId");
    expect(serialized).toContain("SurplusClaim");
    expect(serialized).toContain("vault is { id }");
    expect(serialized).toContain("amount.address");
    expect(serialized).toContain("Erc20ApprovalRequired");
    expect(serialized).toContain("StableVaultWithdrawClaim");
    expect(serialized).toContain("StableVaultPendingAvailability");
    expect(serialized).toContain("StableVaultWithdrawClaimId");
  });

  it("documents token swap quote and prepare paths", () => {
    const quoteReference = getAaveSdkReference("tokenSwapQuote");
    const prepareReference = getAaveSdkReference("prepareTokenSwap");
    const serialized = JSON.stringify([quoteReference, prepareReference]);

    expect(serialized).toContain("sell: { erc20");
    expect(serialized).toContain("Use kind SELL");
    expect(serialized).toContain("quote.costs.networkCosts is a single");
    expect(serialized).toContain("lower-than-fee");
    expect(serialized).toContain("quote.quoteId");
    expect(serialized).toContain("Insufficient balance");
    expect(serialized).toContain("cannot sign");
  });

  it("documents position swap quote and preview request shapes", () => {
    const supplySwapReference = getAaveSdkReference("supplySwapQuote");
    const borrowSwapReference = getAaveSdkReference("borrowSwapQuote");
    const repayWithSupplyReference = getAaveSdkReference(
      "repayWithSupplyQuote"
    );
    const withdrawSwapReference = getAaveSdkReference("withdrawSwapQuote");
    const prepareReference = getAaveSdkReference("preparePositionSwap");
    const previewReference = getAaveSdkReference("preview");
    const serialized = JSON.stringify([
      supplySwapReference,
      borrowSwapReference,
      repayWithSupplyReference,
      withdrawSwapReference,
      prepareReference,
      previewReference,
    ]);

    expect(serialized).toContain("UserSupplyItemId");
    expect(serialized).toContain("UserBorrowItemId");
    expect(serialized).toContain("enableCollateral");
    expect(serialized).toContain("repayWithReserve");
    expect(serialized).toContain("buyToken");
    expect(serialized).toContain("do not use position");
    expect(serialized).toContain("PositionSwapByIntentApprovalsRequired");
    expect(serialized).toContain("adapterContractSignature");
    expect(serialized).toContain("PreviewUserPosition");
    expect(serialized).toContain("exactly one nested action key");
  });

  it("documents hubs as a discovery source for hub-scoped requests", () => {
    const hubReference = getAaveSdkReference("hub");
    const hubsReference = getAaveSdkReference("hubs");
    const hubAssetsReference = getAaveSdkReference("hubAssets");
    const hubAssetInterestRateModelReference = getAaveSdkReference(
      "hubAssetInterestRateModel"
    );
    const hubSummaryHistoryReference = getAaveSdkReference("hubSummaryHistory");
    const hubSpokeConfigsReference = getAaveSdkReference("hubSpokeConfigs");
    const serialized = JSON.stringify([
      hubReference,
      hubsReference,
      hubAssetsReference,
      hubAssetInterestRateModelReference,
      hubSummaryHistoryReference,
      hubSpokeConfigsReference,
    ]);

    expect(serialized).toContain("hub-id-from-aave.hubs");
    expect(serialized).toContain("hubSpokeConfigs");
    expect(serialized).toContain("hub-asset-id-from-aave.hubAssets");
    expect(serialized).toContain("utilizationRate.normalized");
    expect(serialized).toContain("totalSupplied.current.value");
    expect(serialized).toContain("totalBorrowed.current.value");
    expect(serialized).toContain("summary.supplied.exchange.value");
    expect(serialized).toContain("sample.availableLiquidity.value");
    expect(serialized).toContain("spoke-id-from-aave.spokes");
    expect(serialized).toContain("supplyCap.amount.value");
  });

  it("documents common token and wallet balance lookups without fallback text", () => {
    const commonReadActions = [
      "asset",
      "assetPriceHistory",
      "assetSupplyHistory",
      "assetBorrowHistory",
      "exchangeRate",
      "protocolHistory",
      "swappableTokens",
      "userBalances",
      "userSwaps",
      "tokenSwapQuote",
      "prepareTokenSwap",
      "swapStatus",
      "stableVaults",
      "stableVault",
      "stableVaultUserPositions",
      "stableVaultMovements",
      "stableVaultRateUsers",
      "stableVaultClaimStatus",
      "hubAssetInterestRateModel",
      "hasProcessedKnownTransaction",
      "supplySwapQuote",
      "borrowSwapQuote",
      "repayWithSupplyQuote",
      "withdrawSwapQuote",
      "preparePositionSwap",
      "prepareSwapCancel",
      "preview",
      "swap",
      "cancelSwap",
      "waitForSwapOutcome",
      "waitForStableVaultWithdrawClaim",
      "supply",
      "borrow",
      "repay",
      "withdraw",
      "claimRewards",
      "setUserSuppliesAsCollateral",
      "updateUserPositionConditions",
      "setSpokeUserPositionManager",
      "renounceSpokeUserPositionManager",
      "liquidatePosition",
      "stableVaultAssignRate",
      "stableVaultUnassignRate",
      "stableVaultClaimSurplus",
      "stableVaultDeposit",
      "stableVaultWithdraw",
      "stableVaultWithdrawRedeem",
    ] as const;

    for (const action of commonReadActions) {
      const reference = getAaveSdkReference(action);
      const serialized = JSON.stringify(reference);

      expect(serialized).not.toContain("No curated example yet");
      expect(serialized).toContain("exampleCode");
    }
  });

  it("documents user balance and asset request shapes that are easy to guess wrong", () => {
    const userBalancesReference = getAaveSdkReference("userBalances");
    const assetReference = getAaveSdkReference("asset");
    const serialized = JSON.stringify([userBalancesReference, assetReference]);

    expect(serialized).toContain("filter.chains.chainIds");
    expect(serialized).toContain("not filter.chainIds");
    expect(serialized).toContain("byReservesType");
    expect(serialized).toContain("query.token");
    expect(serialized).toContain("Do not pass reserve.asset.id");
    expect(serialized).toContain("asset.token.info.symbol");
    expect(serialized).toContain("balance.totalAmount.value");
  });

  it("uses action-specific descriptions for codemode provider tools", () => {
    const reserveDescription = getAaveSdkActionToolDescription("reserve");
    const depositDescription =
      getAaveSdkActionToolDescription("stableVaultDeposit");

    expect(reserveDescription).toContain("Request shape");
    expect(reserveDescription).toContain("reserve-id-from-aave.reserves");
    expect(reserveDescription).toContain("aave.reserve");
    expect(depositDescription).toContain("vault is { id }");
    expect(depositDescription).toContain("amount.address");
    expect(depositDescription).not.toContain("No curated example yet");
  });

  it("documents the sandbox type contract and action-specific reference path", () => {
    expect(AAVE_SDK_TYPES).toContain("Actions return unwrapped SDK values");
    expect(AAVE_SDK_TYPES).toContain("not ResultAsync");
    expect(AAVE_SDK_TYPES).toContain("AaveSdkActionError");
    expect(AAVE_SDK_TYPES).toContain("check __typename");
    expect(AAVE_SDK_TYPES).toContain("Do not catch aave action errors");
    expect(AAVE_SDK_TYPES).toContain("do not fabricate ReserveId");
    expect(AAVE_SDK_TYPES).toContain("type StableVaultWithdrawClaimId");
    expect(AAVE_SDK_TYPES).toContain("type AmountInput");
    expect(AAVE_SDK_TYPES).toContain(
      'Call get_aave_sdk_reference({ action: "stableVaultDeposit" })'
    );
  });

  it("classifies every SDK action exactly once", () => {
    const categorizedActions = Object.values(AAVE_SDK_ACTION_CATEGORIES).flat();
    const uniqueCategorizedActions = new Set(categorizedActions);

    expect(uniqueCategorizedActions.size).toBe(categorizedActions.length);
    expect([...uniqueCategorizedActions].sort()).toEqual(
      [...AAVE_SDK_ACTION_NAMES].sort()
    );
  });

  it("gives category-aware fallback guidance for uncatalogued actions", () => {
    const hubReference = getAaveSdkReference("hub");
    const supplyReference = getAaveSdkReference("supply");
    const quoteReference = getAaveSdkReference("tokenSwapQuote");
    const pollingReference = getAaveSdkReference("waitForSwapOutcome");
    const allReferences = getAaveSdkReference();
    const serialized = JSON.stringify([
      hubReference,
      supplyReference,
      quoteReference,
      pollingReference,
      allReferences,
    ]);

    expect(serialized).toContain("Read-only query action");
    expect(serialized).toContain("Transaction-building action");
    expect(serialized).toContain("Quote or preview action");
    expect(serialized).toContain("Polling helper");
    expect(serialized).toContain("cannot sign or broadcast");
  });
});

describe("addAaveSdkErrorGuidance", () => {
  it("adds actionable guidance for syntax failures", () => {
    const message = addAaveSdkErrorGuidance(
      "Failed to start Worker: Uncaught SyntaxError: Unexpected token ')'"
    );

    expect(message).toContain("one async arrow function");
    expect(message).toContain("avoid top-level await");
  });

  it("adds request-shape guidance for GraphQL failures", () => {
    const message = addAaveSdkErrorGuidance(
      'UnexpectedError: [GraphQL] Expected input type "SpokeId", found {address: "0x...", chainId: 1}.'
    );

    expect(message).toContain("get_aave_sdk_reference");
    expect(message).toContain("opaque spoke id");
    expect(message).toContain("orderBy");
  });

  it("adds specific guidance for asset id and user balance filter mistakes", () => {
    const message = addAaveSdkErrorGuidance(
      'UnexpectedError: [GraphQL] Invalid value for argument "request.filter", unknown field "chainIds" of type "UserBalancesRequestFilter". Failed to parse "AssetId": Invalid AssetId format'
    );

    expect(message).toContain("query.token");
    expect(message).toContain("reserve.asset.id");
    expect(message).toContain("filter: { chains: { chainIds: [1]");
  });

  it("adds specific guidance for reserve request shape mistakes", () => {
    const message = addAaveSdkErrorGuidance(
      'UnexpectedError: [GraphQL] Invalid value for argument "request", field "query" of type "ReserveRequestQuery!" is required but not provided'
    );

    expect(message).toContain("{ query: { reserveId } }");
    expect(message).toContain("aave.reserves");
    expect(message).toContain("{ reserve: reserveId }");
  });

  it("recognizes insufficient balance as a valid request with missing funds", () => {
    const message = addAaveSdkErrorGuidance(
      "UnexpectedError: [GraphQL] Bad user input - Insufficient balance"
    );

    expect(message).toContain("request shape is valid");
    expect(message).toContain("userBalances");
  });

  it("explains borrow attempts that exceed available borrowing power", () => {
    const message = addAaveSdkErrorGuidance(
      "UnexpectedError: [GraphQL] Bad user input - Trying to borrow more than you are allowed to borrow"
    );

    expect(message).toContain("request shape is valid");
    expect(message).toContain("remainingBorrowingPower");
    expect(message).toContain("healthFactor");
  });

  it("explains token swap amounts that are lower than fees", () => {
    const message = addAaveSdkErrorGuidance(
      "UnexpectedError: [GraphQL] Server error - Error: The sell amount for the sell order is lower than the fee."
    );

    expect(message).toContain("Increase amount");
    expect(message).toContain("token input shape");
  });

  it("explains stable vault claim id scalar failures", () => {
    const message = addAaveSdkErrorGuidance(
      'UnexpectedError: [GraphQL] Failed to parse "StableVaultWithdrawClaimId": Invalid StableVaultWithdrawClaimId format'
    );

    expect(message).toContain("real claimId");
    expect(message).toContain("stableVaultWithdraw");
    expect(message).toContain("Do not fabricate");
  });

  it("explains opaque id scalar failures", () => {
    const message = addAaveSdkErrorGuidance(
      'UnexpectedError: [GraphQL] Failed to parse "ReserveId": Invalid ReserveId format'
    );

    expect(message).toContain("Opaque Aave ids");
    expect(message).toContain("reserves");
    expect(message).toContain("stableVaults");
    expect(message).toContain("userSupplies");
  });

  it("adds response-shape guidance for undefined field failures", () => {
    const message = addAaveSdkErrorGuidance(
      "Cannot read properties of undefined (reading 'amount')"
    );

    expect(message).toContain("response shape");
    expect(message).toContain("Object.keys");
    expect(message).toContain("compact examples");
  });
});

describe("MCP validation guidance", () => {
  it("serializes sandbox return values with BigInt and circular references", () => {
    const circular: Record<string, unknown> = { amount: 1n };
    circular.self = circular;

    const serialized = truncateResponse({ result: circular, logs: [] });

    expect(serialized).toContain('"amount": "1"');
    expect(serialized).toContain('"self": "[Circular]"');
  });

  it("explains malformed tools/call params", () => {
    expect(invalidToolCallParamsMessage).toContain("{ name: string");
    expect(invalidToolCallParamsMessage).toContain("tools/list");
  });

  it("explains missing code arguments with an executable example", () => {
    expect(missingCodeArgumentMessage).toContain("arguments.code");
    expect(missingCodeArgumentMessage).toContain("async () =>");
    expect(missingCodeArgumentMessage).toContain("aave.chains");
  });

  it("lists supported tools for unknown tool names", () => {
    const message = unknownToolMessage("run_code");

    expect(message).toContain("Unknown tool: run_code");
    expect(message).toContain("execute_aave_sdk_code");
    expect(message).toContain("get_aave_sdk_reference");
  });

  it("points unknown Aave actions back to the reference tool", () => {
    const message = unknownAaveActionMessage("userSupply");

    expect(message).toContain("Unknown Aave SDK action: userSupply");
    expect(message).toContain("get_aave_sdk_reference");
    expect(message).toContain("userSupplies");
    expect(message).toContain("userPositions");
  });
});

describe("MCP protocol guidance", () => {
  it("explains parse and request shape failures", () => {
    expect(parseErrorMessage).toContain("JSON-RPC 2.0");
    expect(parseErrorMessage).toContain("tools/list");
    expect(invalidRequestMessage).toContain('jsonrpc: "2.0"');
    expect(invalidRequestMessage).toContain("initialize");
    expect(invalidRequestMessage).toContain("tools/call");
  });

  it("explains unsupported methods and HTTP methods", () => {
    expect(methodNotFoundMessage("resources/list")).toContain("resources/list");
    expect(methodNotFoundMessage("resources/list")).toContain("tools/list");
    expect(postOnlyMessage).toContain("Use POST");
    expect(postOnlyMessage).toContain("/mcp/v4");
  });
});
