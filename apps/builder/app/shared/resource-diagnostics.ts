import { assetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import type { ResourceRequest } from "@webstudio-is/sdk";
import { isAssetsResourceRequest } from "@webstudio-is/sdk/runtime";
import { z } from "zod";

export const resourcePerformance = z.object({
  serverDurationMs: z.number().nonnegative().optional(),
  loaderDurationMs: z.number().nonnegative().optional(),
  responseBytes: z.number().int().nonnegative().optional(),
  assetQuery: z
    .object({
      phases: z
        .object({
          authorization: z.number().nonnegative().optional(),
          buildPlan: z.number().nonnegative().optional(),
          repositoryAuthorization: z.number().nonnegative().optional(),
          sourceSnapshot: z.number().nonnegative().optional(),
          canonicalMetadata: z.number().nonnegative().optional(),
          compilerEntries: z.number().nonnegative().optional(),
          compilerContentRead: z.number().nonnegative().optional(),
          documentGraph: z.number().nonnegative().optional(),
          documentGraphContentRead: z.number().nonnegative().optional(),
          assetReferences: z.number().nonnegative().optional(),
          sourceValidation: z.number().nonnegative().optional(),
          artifactCompilation: z.number().nonnegative().optional(),
          indexPreparation: z.number().nonnegative().optional(),
          diagnosticsPreparation: z.number().nonnegative().optional(),
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

type ResourceDiagnosticsSchemaIssue = {
  code: string;
  path: string[];
  message: string;
};

export const createResourceDiagnosticsResponseError = ({
  message,
  issues,
}: {
  message: string;
  issues: readonly ResourceDiagnosticsSchemaIssue[];
}) => ({
  ok: false as const,
  status: 500,
  data: {
    error: {
      code: "INVALID_DIAGNOSTICS_RESPONSE",
      message,
      retryable: true,
      details: {
        issues: issues.map((issue) => ({
          ...issue,
          severity: "error" as const,
          scope: "diagnostics" as const,
        })),
      },
    },
  },
});

type SeparatedResourceDiagnostics = {
  result: unknown;
  diagnostics?: z.infer<typeof assetQueryPreviewDiagnostics>;
  diagnosticsError?: ReturnType<typeof createResourceDiagnosticsResponseError>;
  performance?: ResourcePerformance;
};

// Assets diagnostics may be shown by Builder, but must never enter the value
// exposed to expressions. Ordinary APIs may legitimately use the same field.
export const separateResourceDiagnostics = ({
  request,
  result,
}: {
  request?: ResourceRequest;
  result: unknown;
}): SeparatedResourceDiagnostics => {
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
  const parsedDiagnostics =
    assetQueryPreviewDiagnostics.safeParse(__diagnostics__);
  if (parsedDiagnostics.success === false) {
    const issues: ResourceDiagnosticsSchemaIssue[] = [];
    for (const issue of parsedDiagnostics.error.issues) {
      const path = ["__diagnostics__", ...issue.path.map(String)];
      if (issue.code === "unrecognized_keys") {
        for (const key of issue.keys) {
          issues.push({
            code: issue.code,
            path: [...path, key],
            message: issue.message,
          });
        }
        continue;
      }
      issues.push({ code: issue.code, path, message: issue.message });
    }
    return {
      result: resourceResult,
      diagnostics: undefined,
      diagnosticsError: createResourceDiagnosticsResponseError({
        message: "Resource diagnostics response is invalid",
        issues,
      }),
      performance,
    };
  }
  return {
    result: resourceResult,
    diagnostics: parsedDiagnostics.data,
    performance,
  };
};
