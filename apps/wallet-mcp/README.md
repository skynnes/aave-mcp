# Wallet MCP Server (Cloudflare Workers)

This app is a dedicated MCP server for wallet bootstrapping, signing, and transaction submission using Coinbase CDP server wallets.

## What this app includes

- MCP endpoint: `/mcp`
- Tool: `public_healthcheck`
- Tool: `wallet_get_or_create_evm_account`
- Tool: `wallet_get_evm_account`
- Tool: `wallet_request_evm_faucet`
- Tool: `wallet_list_evm_token_balances`
- Tool: `wallet_sign_evm_transaction`
- Tool: `wallet_send_evm_transaction`
- Tool: `wallet_aave_fork_top_up`

## Run locally

```sh
bun install
bun run dev
```

## Required secrets

```sh
wrangler secret put CDP_API_KEY_ID
wrangler secret put CDP_API_KEY_SECRET
wrangler secret put CDP_WALLET_SECRET
```

## Custom network support (Aave v4 demo)

You can pass a `network` per tool call.

- Known CDP network names are supported (for example `base-sepolia`).
- Custom RPC URLs are supported for transaction submission/signing. For non-CDP chains, the server signs via CDP and broadcasts the raw transaction directly to your RPC.

Optional alias mapping in `wrangler.toml`:

```toml
[vars]
WALLET_NETWORK_MAP_JSON = '{"aave-v4":{"rpcUrl":"https://rpc.your-demo-chain.example","chainId":123456789}}'
WALLET_DEFAULT_NETWORK = "aave-v4"
```

You can also pass `chainId` directly to `wallet_send_evm_transaction` (for example `123456789`) if you need to override the mapped value.

If you set `WALLET_ALLOWED_NETWORKS`, only values in that comma-separated list are accepted (matches alias or resolved value).

## Aave fork top up helper

Use `wallet_aave_fork_top_up` to call the fork funding mutation.

Example tool args:

```json
{
  "user": "0xCe3b168c87bed77Ac8fA6CfC176484BF51390D1e",
  "currency": "0x111111111117dC0aa78b770fA6A738034120C302",
  "value": "1000"
}
```

Set `AAVE_GRAPHQL_URL` in Worker vars (or pass `graphqlUrl` per call).
