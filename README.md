# Aave MCP Monorepo

Monorepo for Cloudflare Worker-based MCP servers used for Aave data access and wallet actions.

## Workspace layout

- `apps/aave-mcp`: Aave GraphQL MCP server with `/mcp/v3` and `/mcp/v4` endpoints
- `apps/cdp-wallet-mcp`: Wallet MCP server backed by Coinbase CDP server wallets
- `apps/internal-wallet-mcp`: Local/internal wallet MCP server backed by D1 + `viem`
- `packages/tsconfig`: shared TypeScript config

## Prerequisites

- Bun `>=1.3.9`

## Quick start

```sh
bun install
bun run dev
```

`bun run dev` starts the default local stack (`aave-mcp` + `internal-wallet-mcp`).

To include all apps (including CDP wallet):

```sh
bun run dev:all
```

## Common commands

```sh
bun run dev
bun run dev:all
bun run dev:cdp
bun run build
bun run deploy
bun run typecheck
bun run check
bun run fix
bun run inspector
```

`bun run deploy` deploys all Worker apps under `apps/*`.

## Local dev matrix

| App | Path | Local URL | Local script | Required secrets/config |
| --- | --- | --- | --- | --- |
| Aave MCP | `apps/aave-mcp` | `http://localhost:8787/mcp/v3`, `http://localhost:8787/mcp/v4`, `http://localhost:8787/mcp` | `cd apps/aave-mcp && bun run dev` | None |
| Internal Wallet MCP | `apps/internal-wallet-mcp` | `http://localhost:8788/mcp` | `cd apps/internal-wallet-mcp && bun run dev` | D1 `DB` binding + `INTERNAL_WALLET_MASTER_KEY` |
| CDP Wallet MCP | `apps/cdp-wallet-mcp` | `http://localhost:8789/mcp` | `bun run dev:cdp` or `cd apps/cdp-wallet-mcp && bun run dev` | `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET` |

See each app README for required secrets, Worker vars, and MCP tool details.
