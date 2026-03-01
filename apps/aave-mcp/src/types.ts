export type RpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: RpcId;
  method?: string;
  params?: unknown;
}

export interface Env {
  LOADER: WorkerLoader;
  AAVE_GRAPHQL_URL?: string;
}

export interface ToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}
