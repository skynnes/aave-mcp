# Aave MCP Server (Cloudflare Workers)

MCP server for Aave schema exploration and GraphQL execution.

## Endpoints and tools

- MCP endpoints: `/mcp/v3` and `/mcp/v4` (`/mcp` defaults to v4)
- Tool: `public_healthcheck`
- Tool: `search_aave_schema`
- Tool: `execute_aave_graphql`

## Run locally

From this directory:

```sh
bun install
bun run dev
```

## MCP URLs

- Local: `http://localhost:8787/mcp/v3`, `http://localhost:8787/mcp/v4`, `http://localhost:8787/mcp`
- Custom domain route: `https://aave.sam.engineer/mcp*`
- Deployed: `https://<your-worker>.workers.dev/mcp/v3`, `https://<your-worker>.workers.dev/mcp/v4`, `https://<your-worker>.workers.dev/mcp`

## Path-based version routing

- `/mcp/v3` -> `https://api.v3.aave.com/graphql`
- `/mcp/v4` -> `https://api.aave.com/graphql`
- `/mcp` -> `https://api.aave.com/graphql` (v4 default)
