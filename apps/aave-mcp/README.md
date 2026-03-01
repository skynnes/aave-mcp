# Aave MCP Codemode Server (Cloudflare Workers)

This app is a focused MCP server for Aave schema exploration and GraphQL execution in codemode.

## What this app includes

- MCP endpoints: `/mcp/v3` and `/mcp/v4` (`/mcp` defaults to v4)
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

- Local: `http://localhost:8787/mcp/v3` or `http://localhost:8787/mcp/v4`
- Deployed: `https://<your-worker>.workers.dev/mcp/v3` or `https://<your-worker>.workers.dev/mcp/v4`
- Default alias: `http://localhost:8787/mcp` and `https://<your-worker>.workers.dev/mcp` route to v4

## Version routing

This worker now routes by path instead of Wrangler environments:

- `/mcp/v3` -> `https://api.v3.aave.com/graphql`
- `/mcp/v4` -> `https://api.aave.com/graphql`
- `/mcp` -> `https://api.aave.com/graphql` (v4 default)
