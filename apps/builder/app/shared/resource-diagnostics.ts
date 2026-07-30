import { assetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import type { ResourceRequest } from "@webstudio-is/sdk";
import { isAssetsResourceRequest } from "@webstudio-is/sdk/runtime";

// Assets diagnostics may be shown by Builder, but must never enter the value
// exposed to expressions. Ordinary APIs may legitimately use the same field.
export const separateResourceDiagnostics = ({
  request,
  result,
}: {
  request?: ResourceRequest;
  result: unknown;
}) => {
  if (
    request === undefined ||
    isAssetsResourceRequest(request) === false ||
    typeof result !== "object" ||
    result === null ||
    "__diagnostics__" in result === false
  ) {
    return { result, diagnostics: undefined };
  }
  const { __diagnostics__, ...resourceResult } = result;
  return {
    result: resourceResult,
    diagnostics: assetQueryPreviewDiagnostics.safeParse(__diagnostics__).data,
  };
};
