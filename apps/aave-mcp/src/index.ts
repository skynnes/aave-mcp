import { homeHtml } from "./home";
import { handleMcp } from "./mcp-server";
import { postOnlyMessage } from "./protocol-guidance";
import { json } from "./rpc";
import type { Env } from "./types";

const mcpPaths = new Set(["/mcp", "/mcp/v4"]);

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

    if (!mcpPaths.has(url.pathname)) {
      return new Response("Not found", { status: 404 });
    }

    if (request.method !== "POST") {
      return json({ error: postOnlyMessage }, 405);
    }

    return handleMcp(request, env);
  },
};
