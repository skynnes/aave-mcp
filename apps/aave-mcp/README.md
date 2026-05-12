# Aave MCP Server (Cloudflare Workers)

MCP server for Aave v4 SDK codemode execution.

## Endpoints and tools

- MCP endpoints: `/mcp` and `/mcp/v4`
- Tool: `public_healthcheck`
- Tool: `get_aave_sdk_reference`
- Tool: `get_aave_sdk_types`
- Tool: `execute_aave_sdk_code`

`execute_aave_sdk_code` runs a TypeScript async arrow function inside a Dynamic
Worker sandbox. The sandbox exposes an `aave` namespace that maps to
`@aave/client@v4` actions, with the host Worker owning `AaveClient.create()`.

Example:

```ts
async () => {
  const chains = await aave.chains({ query: { filter: "ALL" } });
  return chains.map((chain) => ({
    chainId: chain.chainId,
    name: chain.name,
  }));
}
```

## Run locally

From this directory:

```sh
bun install
bun run dev
```

## MCP URLs

- Local: `http://localhost:8787/mcp`, `http://localhost:8787/mcp/v4`
- Custom domain route: `https://aave.sam.engineer/mcp*`
- Deployed: `https://<your-worker>.workers.dev/mcp`, `https://<your-worker>.workers.dev/mcp/v4`

## SDK execution

- Uses `@aave/client@v4`, currently pinned through `@aave/client@^4.2.0`.
- Uses `@cloudflare/codemode` `DynamicWorkerExecutor` with external network
  access blocked in the sandbox.
- Host-side SDK calls return JSON-safe results to the sandbox, so BigInt and
  SDK numeric wrappers are serialized before crossing the Worker RPC boundary.
