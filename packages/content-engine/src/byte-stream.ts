export type ByteSource = string | Uint8Array | AsyncIterable<Uint8Array>;

const encoder = new TextEncoder();

export const encodeUtf8 = (value: string) => encoder.encode(value);

export const getUtf8ByteLength = (value: string) =>
  encodeUtf8(value).byteLength;

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

const concatenateChunks = (chunks: readonly Uint8Array[], length: number) => {
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

export const toByteChunks = (source: ByteSource): AsyncIterable<Uint8Array> => {
  if (typeof source === "string") {
    return {
      async *[Symbol.asyncIterator]() {
        yield encodeUtf8(source);
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

export const readBytePrefix = async (
  source: ByteSource,
  maximumBytes: number
) => {
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of toByteChunks(source)) {
    const remaining = maximumBytes - length;
    if (remaining <= 0) {
      break;
    }
    const retained = chunk.subarray(0, remaining);
    chunks.push(retained);
    length += retained.byteLength;
    if (length === maximumBytes) {
      break;
    }
  }
  return concatenateChunks(chunks, length);
};

export const readBoundedBytes = async (
  source: ByteSource,
  maximumBytes: number
) => {
  const bytes = await readBytePrefix(source, maximumBytes + 1);
  if (bytes.byteLength > maximumBytes) {
    throw new ByteLimitExceededError();
  }
  return bytes;
};

export const decodeUtf8 = (bytes: Uint8Array) =>
  new TextDecoder("utf-8", { fatal: true }).decode(bytes);
