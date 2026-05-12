type Serializable =
  | boolean
  | number
  | string
  | null
  | Serializable[]
  | { [key: string]: Serializable };

const MAX_RESPONSE_CHARS = 45_000;
const MAX_RESPONSE_DEPTH = 12;
const MAX_RESPONSE_ARRAY_ITEMS = 200;
const MAX_RESPONSE_OBJECT_KEYS = 200;
const MAX_RESPONSE_STRING_CHARS = 20_000;

const truncateString = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n\n[truncated]`;
};

const toSerializable = (
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0
): Serializable => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : String(value);
  }

  if (typeof value === "string") {
    return truncateString(value, MAX_RESPONSE_STRING_CHARS);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  if (depth >= MAX_RESPONSE_DEPTH) {
    return "[MaxDepth]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_RESPONSE_ARRAY_ITEMS)
      .map((entry) => toSerializable(entry, seen, depth + 1));
  }

  const entries = Object.entries(value)
    .slice(0, MAX_RESPONSE_OBJECT_KEYS)
    .map(([key, entry]) => [key, toSerializable(entry, seen, depth + 1)]);

  return Object.fromEntries(entries) as { [key: string]: Serializable };
};

export const truncateResponse = (value: unknown): string => {
  const asString =
    typeof value === "string"
      ? value
      : (JSON.stringify(toSerializable(value), null, 2) ?? "null");
  return truncateString(asString, MAX_RESPONSE_CHARS);
};
