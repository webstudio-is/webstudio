import { createChunkDecoder } from "ai";
import type { ErrorResponse, SuccessResponse } from "../types";

type RequestOptions = {
  retry?: number;
};

export const request = function request<ResponseData>(
  fetchArgs: Parameters<typeof fetch>,
  options: RequestOptions = { retry: 0 }
): Promise<SuccessResponse<ResponseData> | ErrorResponse> {
  return fetch(...fetchArgs)
    .then((res) => {
      if (res.ok === false) {
        return {
          success: false,
          type: "generic_error",
          status: res.status,
          message: res.statusText,
        } as ErrorResponse;
      }
      return res.json();
    })
    .catch((error) => {
      const isAborted = error.name === "AbortError";

      if (
        isAborted === false &&
        typeof options.retry === "number" &&
        options.retry > 0
      ) {
        return requestStream(fetchArgs, {
          ...options,
          retry: options.retry - 1,
        });
      }
      return {
        success: false,
        type: error.name === "AbortError" ? "aborted" : "generic_error",
        status: 500,
        message: "",
      } as ErrorResponse;
    });
};

type RequestStreamOptions = {
  onChunk?: (completion: string) => void;
  retry?: number;
};

export const requestStream = async function requestStream(
  fetchArgs: Parameters<typeof fetch>,
  options: RequestStreamOptions = {
    retry: 0,
  }
): Promise<string | ErrorResponse> {
  let isAborted = false;
  return fetch(...fetchArgs)
    .then(async (response) => {
      if (response.ok === false || response.body == null) {
        return {
          success: false,
          type: "generic_error",
          status: response.status,
          message: response.body
            ? response.statusText
            : "The response is empty",
        } as ErrorResponse;
      }
      if (response.headers.get("Content-Type")?.includes("application/json")) {
        const json: ErrorResponse = await response.json();
        return json;
      }

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

        if (typeof options.onChunk === "function") {
          options.onChunk(completion);
        }

        if (isAborted) {
          reader.cancel();
          break;
        }
      }

      return completion;
    })
    .catch((error) => {
      isAborted = error.name === "AbortError";

      if (
        isAborted === false &&
        typeof options.retry === "number" &&
        options.retry > 0
      ) {
        return requestStream(fetchArgs, {
          ...options,
          retry: options.retry - 1,
        });
      }

      return {
        success: false,
        type: error.name === "AbortError" ? "aborted" : "generic_error",
        status: 500,
        message: "",
      } as ErrorResponse;
    });
};
