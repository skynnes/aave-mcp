# Aave MCP Codemode Server (Cloudflare Workers)

This app is a focused MCP server for Aave schema exploration and GraphQL execution in codemode.

## What this app includes

- MCP endpoint: `/mcp`
- No OAuth requirement (`noauth` tools)
- Tool: `public_healthcheck`
- Tool: `search_aave_schema`
- Tool: `execute_aave_graphql`

## Run locally

```sh
bun install
bun run dev
```

## MCP endpoint

- Local: `http://localhost:8787/mcp`
- Deployed: `https://<your-worker>.workers.dev/mcp`

## Optional endpoint overrides

By default, codemode uses `https://api.v3.aave.com/graphql`.

- Deploy v3: `wrangler deploy --env v3`
- Deploy v4: `wrangler deploy --env v4`
