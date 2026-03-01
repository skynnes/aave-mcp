export type RpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: RpcId;
  method?: string;
  params?: unknown;
}

export interface Env {
  DB?: D1Database;
  INTERNAL_WALLET_MASTER_KEY?: string;
  INTERNAL_WALLET_FAUCET_PRIVATE_KEY?: string;
  INTERNAL_WALLET_FAUCET_AMOUNT_MAP_JSON?: string;
  INTERNAL_WALLET_TOKEN_MAP_JSON?: string;
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
