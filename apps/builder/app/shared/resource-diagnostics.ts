import { assetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";

// Diagnostics may be shown by Builder, but must never enter the resource value
// exposed to expressions and rendered bindings.
export const stripResourceDiagnostics = (result: unknown) => {
  if (
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
