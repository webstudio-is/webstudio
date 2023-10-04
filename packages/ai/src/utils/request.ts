import { StreamingTextResponse, createChunkDecoder } from "ai";
import type {
  ErrorResponse,
  StreamingSuccessResponse,
  SuccessResponse,
} from "../types";
import { createErrorResponse } from "./create-error-response";

type RequestOptions = {
  onChunk?: (
    operationId: string,
    data: { decoded: string; value: Uint8Array | undefined; done: boolean }
  ) => void;
  retry?: number;
};

export const request = <ResponseData = void>(
  fetchArgs: Parameters<typeof fetch>,
  { retry = 0, onChunk }: RequestOptions
): Promise<
  SuccessResponse<ResponseData> | StreamingSuccessResponse | ErrorResponse
> => {
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

          completion += decoder(value);

          if (typeof onChunk === "function") {
            onChunk(operationId, {
              decoded: completion,
              value,
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
          stream: new StreamingTextResponse(
            new Blob([completion], { type: "text/plain" }).stream()
          ),
        } as const;
      }

      return (await response.json()) as
        | SuccessResponse<ResponseData>
        | ErrorResponse;
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
