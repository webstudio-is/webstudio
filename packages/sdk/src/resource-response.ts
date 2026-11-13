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

/** Buffer before cloning or caching, with headers describing the decoded body. */
export const readResourceResponse = async (response: Response) => {
  const body = await readLimitedBytes(
    response.body,
    maxResourceResponseBytes,
    new ResourceResponseTooLargeError()
  );
  const result = new Response(body, response);
  result.headers.delete("content-length");
  result.headers.delete("content-encoding");
  return result;
};
