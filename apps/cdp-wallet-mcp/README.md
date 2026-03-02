# CDP Wallet MCP Server (Cloudflare Workers)

MCP server for wallet bootstrapping, signing, and transaction submission using Coinbase CDP server wallets.

## Endpoint and tools

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

From this directory:

```sh
bun install
bun run dev
```

Alias: `bun run dev:cdp`

Local MCP URL: `http://localhost:8789/mcp`

## Required secrets

```sh
wrangler secret put CDP_API_KEY_ID
wrangler secret put CDP_API_KEY_SECRET
wrangler secret put CDP_WALLET_SECRET
```

## Optional network configuration

You can pass `network` per tool call.

- Known CDP network names are supported (for example `base-sepolia`).
- Custom RPC URLs are supported for signing/submission. For non-CDP chains, the server signs via CDP and broadcasts raw transactions directly to your RPC.

Example alias mapping in `wrangler.toml`:

```toml
[vars]
WALLET_NETWORK_MAP_JSON = '{"aave-v4":{"rpcUrl":"https://rpc.your-demo-chain.example","chainId":123456789}}'
WALLET_DEFAULT_NETWORK = "aave-v4"
```

If `WALLET_ALLOWED_NETWORKS` is set, only values in that comma-separated allowlist are accepted.

## Aave fork top-up helper

Use `wallet_aave_fork_top_up` to call the fork funding mutation.

Example tool args:

```json
{
  "user": "0xCe3b168c87bed77Ac8fA6CfC176484BF51390D1e",
  "currency": "0x111111111117dC0aa78b770fA6A738034120C302",
  "value": "1000"
}
```

Set `AAVE_GRAPHQL_URL` in Worker vars, or pass `graphqlUrl` per call.
