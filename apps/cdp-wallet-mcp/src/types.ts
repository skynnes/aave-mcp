export type RpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: RpcId;
  method?: string;
  params?: unknown;
}

export interface Env {
  CDP_API_KEY_ID?: string;
  CDP_API_KEY_SECRET?: string;
  CDP_WALLET_SECRET?: string;
  AAVE_GRAPHQL_URL?: string;
  WALLET_DEFAULT_NETWORK?: string;
  WALLET_NETWORK_MAP_JSON?: string;
  WALLET_ALLOWED_NETWORKS?: string;
}

export interface ToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface ToolCallResponse {
  result?: {
    content: Array<{
      type: "text";
      text: string;
    }>;
  };
  error?: string;
  code?: number;
}
