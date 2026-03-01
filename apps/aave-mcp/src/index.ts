import { homeHtml } from "./home";
import { handleMcp } from "./mcp-server";
import { json } from "./rpc";
import type { Env } from "./types";

const AAVE_V3_GRAPHQL_URL = "https://api.v3.aave.com/graphql";
const AAVE_V4_GRAPHQL_URL = "https://api.aave.com/graphql";

const endpointByPath: Record<string, string> = {
  "/mcp": AAVE_V4_GRAPHQL_URL,
  "/mcp/v3": AAVE_V3_GRAPHQL_URL,
  "/mcp/v4": AAVE_V4_GRAPHQL_URL,
};

export default {
  fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (url.pathname === "/") {
      return new Response(homeHtml, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const endpoint = endpointByPath[url.pathname];
    if (!endpoint) {
      return new Response("Not found", { status: 404 });
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST for MCP requests" }, 405);
    }

    return handleMcp(request, {
      ...env,
      AAVE_GRAPHQL_URL: endpoint,
    });
  },
};
