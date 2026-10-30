// Limits decoded body bytes, not Content-Length (which may describe compressed bytes).
const maxResourceResponseBytes = 1024 * 1024;

export class ResourceResponseTooLargeError extends Error {
  readonly code = "RESPONSE_TOO_LARGE";
  constructor() {
    super(
      "Resource response exceeds 1 MiB. Request fewer fields or use pagination."
    );
  }
}

export const readLimitedBytes = async (
  stream: ReadableStream<Uint8Array> | null,
  maximum: number,
  error = new Error("Resource request or response is too large")
) => {
  if (stream === null) {
    return;
  }
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      length += value.byteLength;
      if (length > maximum) {
        await reader.cancel().catch(() => {});
        throw error;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

export const readResourceResponseBytes = (response: Response) =>
  readLimitedBytes(
    response.body,
    maxResourceResponseBytes,
    new ResourceResponseTooLargeError()
  );
