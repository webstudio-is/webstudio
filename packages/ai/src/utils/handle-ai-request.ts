import { createChunkDecoder } from "ai";
import type { ModelResponse } from "../types";
import { RemixStreamingTextResponse } from "./remix-streaming-text-response";

type RequestOptions = {
  onChunk: (
    operationId: string,
    data: {
      completion: string;
      chunk: Uint8Array | undefined;
      decodedChunk: string;
      done: boolean;
    }
  ) => void;
};

export const handleAiRequest = async <ResponseData>(
  request: Promise<Response>,
  options?: RequestOptions
) => {
  const response = await request;

  if (response.status !== 200) {
    // Non 200 responses are unrecoverable errors.
    throw new Error(
      `response.status is ${response.status}, response ${(
        await response.text()
      ).slice(0, 1000)}`
    );
  }

  const isStream =
    (response.headers.get("content-type") || "").startsWith("text/plain") &&
    response.body instanceof ReadableStream;

  if (isStream) {
    // @todo Add delimiter to text streaming response to extract the operation id.
    const operationId = "copywriter";

    let completion = "";
    const reader = response.body.getReader();
    const decoder = createChunkDecoder();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const decodedChunk = decoder(value);
      completion += decodedChunk;

      options?.onChunk(operationId, {
        completion,
        chunk: value,
        decodedChunk,
        done,
      });
    }

    return {
      id: operationId,
      type: "stream",
      success: true,
      data: new RemixStreamingTextResponse(
        new Blob([completion], { type: "text/plain" }).stream()
      ),
      tokens: { prompt: -1, completion: -1 },
    } as const;
  }

  // @todo Convert the response types to Zod
  // so that responses can be parsed and validated on the client.
  return (await response.json()) as ModelResponse<ResponseData>;
};
