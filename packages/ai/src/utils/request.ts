import { createChunkDecoder } from "ai";
import type { LlmResponse } from "../types";
import { createErrorResponse } from "./create-error-response";
import { StreamingTextResponse } from "./streaming-text-response";

type RequestOptions = {
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

export const request = <ResponseData>(
  fetchArgs: Parameters<typeof fetch>,
  options?: RequestOptions
) => {
  const signal = fetchArgs[1]?.signal;
  return fetch(...fetchArgs)
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

          if (signal?.aborted === true) {
            reader.cancel();
            break;
          }
        }

        return {
          id: operationId,
          type: "stream",
          success: true,
          data: new StreamingTextResponse(
            new Blob([completion], { type: "text/plain" }).stream()
          ),
          tokens: { prompt: -1, completion: -1 },
        } as const;
      }

      // @todo Convert the response types to Zod
      // so that responses can be parsed and validated on the client.
      return (await response.json()) as LlmResponse<ResponseData>;
    })
    .catch((error) => {
      return {
        id: "",
        ...createErrorResponse({
          status: 500,
          error: "ai.unhandledError",
          debug: error.message + "\n" + error.stack,
        }),
      } as const;
    });
};
