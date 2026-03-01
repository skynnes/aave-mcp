interface CodeExecutorEntrypoint {
  evaluate(): Promise<{ result: unknown; err?: string }>;
}

interface LoaderEnv {
  LOADER: WorkerLoader;
  AAVE_GRAPHQL_URL?: string;
}

const DEFAULT_AAVE_GRAPHQL_ENDPOINT = "https://api.v3.aave.com/graphql";

const INTROSPECTION_QUERY = `query AaveIntrospection {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      kind
      name
      description
      fields {
        name
        description
        args {
          name
          description
          type {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
        type {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
            }
          }
        }
      }
      inputFields {
        name
        description
        type {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
            }
          }
        }
      }
      enumValues {
        name
        description
      }
    }
  }
}`;

const formatWorkerModule = (code: string, endpointUrl: string): string => {
  return `
import { WorkerEntrypoint } from "cloudflare:workers";

const endpoint = ${JSON.stringify(endpointUrl)};
const introspectionQuery = ${JSON.stringify(INTROSPECTION_QUERY)};

let schemaCache;

const stringifyError = (err) => {
  if (err instanceof Error) {
    return err.message;
  }

  return String(err);
};

const aave = {
  endpoint,
  async graphql(query, variables) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error("Aave API request failed: " + response.status);
    }

    if (payload?.errors?.length) {
      const message = payload.errors.map((item) => item?.message ?? "Unknown GraphQL error").join(", ");
      throw new Error(message);
    }

    return payload.data;
  },
  async schema() {
    if (schemaCache) {
      return schemaCache;
    }

    const data = await this.graphql(introspectionQuery, undefined);
    schemaCache = data?.__schema ?? null;
    return schemaCache;
  },
  async listOperations() {
    const schema = await this.schema();
    const queryType = schema?.queryType?.name ?? "Query";
    const mutationType = schema?.mutationType?.name;
    const allTypes = Array.isArray(schema?.types) ? schema.types : [];

    const findType = (name) => allTypes.find((entry) => entry?.name === name);
    const query = findType(queryType)?.fields?.map((field) => field?.name).filter(Boolean) ?? [];
    const mutation = mutationType
      ? (findType(mutationType)?.fields?.map((field) => field?.name).filter(Boolean) ?? [])
      : [];

    return { query, mutation };
  },
  async type(name) {
    if (!name || typeof name !== "string") {
      throw new Error("type(name) expects a non-empty string");
    }

    const schema = await this.schema();
    const types = Array.isArray(schema?.types) ? schema.types : [];
    return types.find((entry) => entry?.name === name) ?? null;
  },
};

export default class AaveCodeExecutor extends WorkerEntrypoint {
  async evaluate() {
    try {
      const result = await (${code})();
      return { result, err: undefined };
    } catch (err) {
      return { result: undefined, err: stringifyError(err) };
    }
  }
}
`;
};

const createExecutor = (env: LoaderEnv, keyPrefix: string) => {
  return async (code: string): Promise<unknown> => {
    const endpoint = env.AAVE_GRAPHQL_URL ?? DEFAULT_AAVE_GRAPHQL_ENDPOINT;
    const worker = env.LOADER.get(
      `${keyPrefix}-${crypto.randomUUID()}`,
      () => ({
        compatibilityDate: "2026-02-10",
        compatibilityFlags: ["nodejs_compat"],
        mainModule: "worker.js",
        modules: {
          "worker.js": formatWorkerModule(code, endpoint),
        },
      })
    );

    const entrypoint =
      worker.getEntrypoint() as unknown as CodeExecutorEntrypoint;
    const response = await entrypoint.evaluate();
    if (response.err) {
      throw new Error(response.err);
    }

    return response.result;
  };
};

const truncateString = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n\n[truncated]`;
};

export const truncateResponse = (value: unknown): string => {
  const asString =
    typeof value === "string"
      ? value
      : (JSON.stringify(value, null, 2) ?? "null");
  return truncateString(asString, 45_000);
};

export const createAaveSearchExecutor = (env: LoaderEnv) => {
  return createExecutor(env, "aave-search");
};

export const createAaveExecuteExecutor = (env: LoaderEnv) => {
  return createExecutor(env, "aave-execute");
};
