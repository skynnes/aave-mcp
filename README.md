# Aave MCP Monorepo

Monorepo for Cloudflare Worker-based MCP servers used for Aave data access and wallet actions.

## Workspace layout

- `apps/aave-mcp`: Aave v4 SDK codemode MCP server with `/mcp` and `/mcp/v4` endpoints
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
| Aave MCP | `apps/aave-mcp` | `http://localhost:8787/mcp`, `http://localhost:8787/mcp/v4` | `cd apps/aave-mcp && bun run dev` | None |
| Internal Wallet MCP | `apps/internal-wallet-mcp` | `http://localhost:8788/mcp` | `cd apps/internal-wallet-mcp && bun run dev` | D1 `DB` binding + `INTERNAL_WALLET_MASTER_KEY` |
| CDP Wallet MCP | `apps/cdp-wallet-mcp` | `http://localhost:8789/mcp` | `bun run dev:cdp` or `cd apps/cdp-wallet-mcp && bun run dev` | `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `CDP_WALLET_SECRET` |

## Agent setup (`aave_v4` + internal wallet)

Prefer the hosted MCP server URLs:

- `aave_v4`: `https://aave.sam.engineer/mcp/v4`
- `wallet` (internal wallet): `https://internal-wallet-mcp.skynnes.workers.dev/mcp`

After adding both servers in your client, use its MCP toggle dropdown and enable both `aave_v4` and `wallet` for the chat/session.

Local fallback (if needed):

- `aave_v4`: `http://localhost:8787/mcp/v4`
- `wallet`: `http://localhost:8788/mcp`

### Codex

This repo already includes `.codex/config.toml`.

```toml
[mcp_servers.aave_v4]
url = "https://aave.sam.engineer/mcp/v4"

[mcp_servers.wallet]
url = "https://internal-wallet-mcp.skynnes.workers.dev/mcp"
```

### OpenCode

Use `opencode.json` and add/keep these entries:

```json
{
  "mcp": {
    "aave_v4": { "type": "remote", "url": "https://aave.sam.engineer/mcp/v4", "oauth": {} },
    "wallet": { "type": "remote", "url": "https://internal-wallet-mcp.skynnes.workers.dev/mcp", "oauth": {} }
  }
}
```

### Claude

In Claude MCP settings, add remote MCP servers:

- `aave_v4` -> `https://aave.sam.engineer/mcp/v4`
- `wallet` -> `https://internal-wallet-mcp.skynnes.workers.dev/mcp`

Then enable both in the MCP toggle dropdown.

### Claude Cowork

Use the same two server URLs as Claude and turn both on from the MCP toggle dropdown in Cowork.

### Claude Code

Add the same two MCP endpoints in Claude Code MCP settings/config, then enable both from the MCP toggle dropdown for the active session.

### ChatGPT

Use the same hosted server pair:

- `aave_v4`: `https://aave.sam.engineer/mcp/v4`
- `wallet`: `https://internal-wallet-mcp.skynnes.workers.dev/mcp`

After connecting the servers, enable both in the tools/MCP dropdown for the chat.

See each app README for required secrets, Worker vars, and MCP tool details.
