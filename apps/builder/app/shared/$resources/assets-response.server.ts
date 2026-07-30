import { json } from "@remix-run/server-runtime";
import {
  createAssetResourceQueryFailure,
  type AssetResourceQueryFailure,
} from "@webstudio-is/content-engine";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";

export const createAssetResourceFailureResponse = ({
  status,
  retryable = false,
  ...error
}: Omit<AssetResourceQueryFailure["error"], "retryable"> & {
  status: number;
  retryable?: boolean;
}) =>
  json(createAssetResourceQueryFailure({ ...error, retryable }), {
    status,
    headers: privateNoStoreResponseHeaders,
  });
