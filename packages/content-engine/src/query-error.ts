import type { AssetResourceQueryFailure } from "./schema";
import { AssetResourceHydrationError } from "./hydration";
import {
  AssetIndexRevisionError,
  AssetQueryExecutionError,
} from "./structured-query";

export type AssetResourceQueryError = Omit<
  AssetResourceQueryFailure["error"],
  "details"
> & {
  details?: Record<string, string | number>;
  status: 400 | 409;
};

/** Classifies content-query failures independently of an HTTP or RPC transport. */
export const getAssetResourceQueryError = (
  error: unknown
): AssetResourceQueryError | undefined => {
  if (error instanceof AssetIndexRevisionError) {
    return {
      code: "STALE_INDEX",
      message: error.message,
      retryable: false,
      status: 409,
    };
  }
  if (error instanceof AssetQueryExecutionError) {
    return {
      code: "INVALID_REQUEST",
      message: error.message,
      retryable: false,
      status: 400,
    };
  }
  if (error instanceof AssetResourceHydrationError) {
    return {
      code: error.code,
      message: error.message,
      retryable: false,
      details: error.details,
      status: 400,
    };
  }
};
