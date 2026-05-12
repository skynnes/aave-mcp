const GENERIC_GUIDANCE =
  "Before retrying, call get_aave_sdk_reference for the Aave action and return a compact JSON projection.";

const hasGuidance = (message: string): boolean => {
  return message.includes("Before retrying");
};

export const addAaveSdkErrorGuidance = (message: string): string => {
  if (hasGuidance(message)) {
    return message;
  }

  const guidance: string[] = [];
  const isAccountStateError =
    message.includes("Insufficient balance") ||
    message.includes("Trying to borrow more than you are allowed to borrow") ||
    message.includes("lower than the fee");

  if (
    message.includes("SyntaxError") ||
    message.includes("Unexpected token") ||
    message.includes("Failed to start Worker")
  ) {
    guidance.push(
      "Use one async arrow function, for example async () => { ... }, and avoid top-level await outside the function."
    );
  }

  if (message.includes("[GraphQL]") && !isAccountStateError) {
    guidance.push(
      "Verify the exact request shape in get_aave_sdk_reference. Common pitfalls: UserSpokeInput uses the opaque spoke id from aave.spokes, not { address, chainId }; several list actions reject guessed orderBy fields."
    );
  }

  if (message.includes("Insufficient balance")) {
    guidance.push(
      "For quote, prepare, and transaction-building actions, Insufficient balance can mean the request shape is valid but the user address lacks the required token balance. Try a smaller amount or first inspect userBalances for the same user."
    );
  }

  if (
    message.includes("Trying to borrow more than you are allowed to borrow")
  ) {
    guidance.push(
      "For borrow, this usually means the request shape is valid but the sender has no available borrowing power for that reserve. Inspect userSummary or userPositions first, check remainingBorrowingPower and healthFactor, then try another user, reserve, or amount."
    );
  }

  if (message.includes("lower than the fee")) {
    guidance.push(
      "For tokenSwapQuote market requests, the sell amount may be below provider or network fees. Increase amount before changing the token input shape."
    );
  }

  if (message.includes("StableVaultWithdrawClaimId")) {
    guidance.push(
      "For stableVaultClaimStatus and stableVaultWithdrawRedeem, use a real claimId returned by a deferred stableVaultWithdraw result. Do not fabricate claim ids."
    );
  }

  if (
    message.includes("Failed to parse") &&
    (message.includes("ReserveId") ||
      message.includes("StableVaultId") ||
      message.includes("SwapQuoteId") ||
      message.includes("SwapId") ||
      message.includes("UserSupplyItemId") ||
      message.includes("UserBorrowItemId") ||
      message.includes("UserPositionId") ||
      message.includes("BoostedRateId"))
  ) {
    guidance.push(
      "Opaque Aave ids must come from SDK discovery responses. Do not invent encoded ids; discover ReserveId with reserves, StableVaultId with stableVaults, SwapQuoteId with quote actions, SwapId with userSwaps, and user item ids with userSupplies/userBorrows/userPositions."
    );
  }

  if (message.includes("Invalid AssetId format")) {
    guidance.push(
      "For asset lookups, prefer query.token with { chainId, address }. Do not reuse reserve.asset.id as query.assetId unless get_aave_sdk_reference explicitly shows that encoded id source."
    );
  }

  if (
    message.includes("UserBalancesRequestFilter") ||
    message.includes('unknown field "chainIds"')
  ) {
    guidance.push(
      'For userBalances, use filter: { chains: { chainIds: [1], byReservesType: "ALL" } }, not filter: { chainIds: [1] }.'
    );
  }

  if (
    message.includes("ReserveRequestQuery") ||
    message.includes('field "query" of type "ReserveRequestQuery')
  ) {
    guidance.push(
      "For reserve, use { query: { reserveId } } after discovering reserve.id with aave.reserves; do not call reserve with { reserve: reserveId }."
    );
  }

  if (message.includes("Cannot read properties of undefined")) {
    guidance.push(
      "The SDK response shape likely differs from the guessed field path. Inspect Object.keys(...) or use the compact examples in get_aave_sdk_reference before accessing nested fields."
    );
  }

  if (guidance.length === 0) {
    guidance.push(GENERIC_GUIDANCE);
  }

  return `${message}\n\n${guidance.join(" ")}`;
};
