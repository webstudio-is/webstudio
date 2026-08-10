import { assetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import type { ResourceRequest } from "@webstudio-is/sdk";
import { isAssetsResourceRequest } from "@webstudio-is/sdk/runtime";
import { z } from "zod";

export const resourcePerformance = z.strictObject({
  serverDurationMs: z.number().nonnegative().optional(),
  loaderDurationMs: z.number().nonnegative().optional(),
  responseBytes: z.number().int().nonnegative().optional(),
  assetQuery: z
    .strictObject({
      phases: z
        .strictObject({
          authorization: z.number().nonnegative().optional(),
          buildPlan: z.number().nonnegative().optional(),
          repositoryAuthorization: z.number().nonnegative().optional(),
          sourceSnapshot: z.number().nonnegative().optional(),
          canonicalMetadata: z.number().nonnegative().optional(),
          compilerEntries: z.number().nonnegative().optional(),
          documentGraph: z.number().nonnegative().optional(),
          assetReferences: z.number().nonnegative().optional(),
          sourceValidation: z.number().nonnegative().optional(),
          artifactCompilation: z.number().nonnegative().optional(),
          indexPreparation: z.number().nonnegative().optional(),
          runtimeAssets: z.number().nonnegative().optional(),
          documentResolution: z.number().nonnegative().optional(),
        })
        .optional(),
      compilationCache: z
        .enum(["hit", "coalesced", "miss", "disabled"])
        .optional(),
      resolvedDocumentCount: z.number().int().nonnegative().optional(),
      documentFetchCount: z.number().int().nonnegative().optional(),
      compilerContentFetchCount: z.number().int().nonnegative().optional(),
      compilerContentBytes: z.number().int().nonnegative().optional(),
      documentGraphContentFetchCount: z.number().int().nonnegative().optional(),
      documentGraphContentBytes: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export type ResourcePerformance = z.infer<typeof resourcePerformance>;

// Assets diagnostics may be shown by Builder, but must never enter the value
// exposed to expressions. Ordinary APIs may legitimately use the same field.
export const separateResourceDiagnostics = ({
  request,
  result,
}: {
  request?: ResourceRequest;
  result: unknown;
}) => {
  if (typeof result !== "object" || result === null) {
    return { result, diagnostics: undefined, performance: undefined };
  }
  const { __performance__, ...resultWithoutPerformance } = result as Record<
    string,
    unknown
  >;
  const performance = resourcePerformance.safeParse(__performance__).data;
  if (
    request === undefined ||
    isAssetsResourceRequest(request) === false ||
    "__diagnostics__" in resultWithoutPerformance === false
  ) {
    return {
      result: resultWithoutPerformance,
      diagnostics: undefined,
      performance,
    };
  }
  const { __diagnostics__, ...resourceResult } = resultWithoutPerformance;
  return {
    result: resourceResult,
    diagnostics: assetQueryPreviewDiagnostics.safeParse(__diagnostics__).data,
    performance,
  };
};
