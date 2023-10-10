import { createChunkDecoder } from "ai";
import type { ModelResponse } from "../types";
import { createErrorResponse } from "./create-error-response";
import { RemixStreamingTextResponse } from "./remix-streaming-text-response";

type RequestOptions = {
  signal: AbortSignal;
  onChunk?: (
    operationId: string,
    data: {
      completion: string;
      chunk: Uint8Array | undefined;
      decodedChunk: string;
      done: boolean;
    }
  ) => void;
};

export const handleAiRequest = <ResponseData>(
  request: Promise<Response>,
  options: RequestOptions
) => {
  return request
    .then(async (response) => {
      if (response.status !== 200) {
        return {
          id: "",
          ...createErrorResponse({
            status: response.status,
            error: "ai.unhandledError",
            debug: response.statusText,
          }),
        } as const;
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

          if (typeof options?.onChunk === "function") {
            options.onChunk(operationId, {
              completion,
              chunk: value,
              decodedChunk,
              done,
            });
          }

          if (options?.signal?.aborted === true) {
            reader.cancel();
            break;
          }
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
    })
    .catch((error) => {
      return {
        id: "",
        ...createErrorResponse({
          status: 500,
          error:
            options?.signal?.aborted === true ? "aborted" : "ai.unhandledError",
          debug: error.message + "\n" + error.stack,
        }),
      } as const;
    });
};
