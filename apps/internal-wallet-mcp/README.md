# Internal Wallet MCP Server (Cloudflare Workers)

This app is a local-only/internal MCP server for testing `aave-mcp` without Coinbase CDP.

It uses:

- `viem` for account management and transaction signing
- Cloudflare D1 for encrypted private-key persistence
- Worker vars for network/faucet configuration

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

## Quick start

1. Create D1 database

```sh
wrangler d1 create internal-wallet-mcp
```

2. Update `wrangler.toml` with the returned `database_id`

3. Generate and set a 32-byte base64 encryption key

```sh
openssl rand -base64 32
```

Then set `INTERNAL_WALLET_MASTER_KEY` in `wrangler.toml` or as a Wrangler secret.

4. Run locally

```sh
bun install
bun run dev
```

## Required configuration

- `DB` D1 binding
- `INTERNAL_WALLET_MASTER_KEY` base64-encoded 32-byte key

## Optional configuration

- `WALLET_DEFAULT_NETWORK` default network alias or RPC URL
- `WALLET_NETWORK_MAP_JSON` alias to RPC map
- `WALLET_ALLOWED_NETWORKS` comma-separated allowlist
- `INTERNAL_WALLET_TOKEN_MAP_JSON` token addresses for balance listing/faucet
- `INTERNAL_WALLET_FAUCET_PRIVATE_KEY` enables `wallet_request_evm_faucet`
- `INTERNAL_WALLET_FAUCET_AMOUNT_MAP_JSON` faucet amount overrides by token
- `AAVE_GRAPHQL_URL` default GraphQL endpoint for `wallet_aave_fork_top_up`

Example:

```toml
[vars]
INTERNAL_WALLET_MASTER_KEY = "<base64-32-byte-key>"
WALLET_DEFAULT_NETWORK = "aave-v4"
WALLET_NETWORK_MAP_JSON = '{"aave-v4":{"rpcUrl":"https://rpc.your-demo-chain.example","chainId":123456789}}'
WALLET_ALLOWED_NETWORKS = "aave-v4,base-sepolia"
INTERNAL_WALLET_TOKEN_MAP_JSON = '{"aave-v4":{"usdc":"0x..."}}'
INTERNAL_WALLET_FAUCET_AMOUNT_MAP_JSON = '{"eth":"10000000000000000","usdc":"1000000"}'
```

Faucet note:

- `wallet_request_evm_faucet` sends funds from `INTERNAL_WALLET_FAUCET_PRIVATE_KEY`.
- For `eth`, it sends native value.
- For non-`eth`, it calls ERC20 `transfer` for the configured token address.
