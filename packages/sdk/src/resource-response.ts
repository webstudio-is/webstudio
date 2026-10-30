import {
  readBoundedBytes,
  readableStreamToAsyncIterable,
} from "@webstudio-is/content-engine/byte-stream";

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

export const readLimitedBytes = (
  stream: ReadableStream<Uint8Array> | null,
  maximum: number,
  error = new Error("Resource request or response is too large")
) => {
  if (stream === null) {
    return;
  }
  return readBoundedBytes(
    readableStreamToAsyncIterable(stream),
    maximum,
    error
  );
};

export const readResourceResponseBytes = (response: Response) =>
  readLimitedBytes(
    response.body,
    maxResourceResponseBytes,
    new ResourceResponseTooLargeError()
  );
