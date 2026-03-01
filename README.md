# apps-sdk-starter

Starter repo for ChatGPT Apps SDK projects on Cloudflare Workers.

## Requirements
- Bun
- Cloudflare Wrangler

## Getting started
```sh
bun install
bun run dev
```

## Repo layout
- apps/aave-mcp: MCP server for Aave schema + GraphQL codemode
- apps/wallet-mcp: MCP server for CDP wallet bootstrap/sign/send flows

## Common scripts
- `bun run dev` runs all dev tasks via Turborepo
- `bun run build` builds all packages
- `bun run lint` runs Ultracite (Biome)
- `bun run format` formats with Ultracite (Biome)
