import type { RpcId } from "./types";

export const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export const json = (payload: unknown, status = 200): Response => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders,
  });
};

export const jsonRpcResult = (id: RpcId, result: unknown): Response => {
  return json({
    jsonrpc: "2.0",
    id,
    result,
  });
};

export const jsonRpcError = (
  id: RpcId,
  code: number,
  message: string
): Response => {
  return json({
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  });
};

export const parseJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};
