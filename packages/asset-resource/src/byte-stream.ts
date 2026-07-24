export type ByteSource = string | Uint8Array | AsyncIterable<Uint8Array>;

const encoder = new TextEncoder();

export class ByteLimitExceededError extends Error {
  constructor() {
    super("Byte stream exceeds the configured limit");
    this.name = "ByteLimitExceededError";
  }
}

export const appendBytes = (previous: Uint8Array, next: Uint8Array) => {
  const result = new Uint8Array(previous.byteLength + next.byteLength);
  result.set(previous);
  result.set(next, previous.byteLength);
  return result;
};

export const toByteChunks = (source: ByteSource): AsyncIterable<Uint8Array> => {
  if (typeof source === "string") {
    return {
      async *[Symbol.asyncIterator]() {
        yield encoder.encode(source);
      },
    };
  }
  if (source instanceof Uint8Array) {
    return {
      async *[Symbol.asyncIterator]() {
        yield source;
      },
    };
  }
  return source;
};

export const readBoundedBytes = async (
  source: ByteSource,
  maximumBytes: number
) => {
  let bytes = new Uint8Array();
  for await (const chunk of toByteChunks(source)) {
    const remaining = maximumBytes + 1 - bytes.byteLength;
    if (remaining <= 0) {
      break;
    }
    bytes = appendBytes(bytes, chunk.subarray(0, remaining));
    if (bytes.byteLength > maximumBytes) {
      throw new ByteLimitExceededError();
    }
  }
  return bytes;
};
