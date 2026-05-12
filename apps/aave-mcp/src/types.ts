export type RpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: RpcId;
  method?: string;
  params?: unknown;
}

export interface Env {
  LOADER: WorkerLoader;
}

export interface ToolCallParams {
  name: string;
  arguments?: Record<string, unknown>;
}
