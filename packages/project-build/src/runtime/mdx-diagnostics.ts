import {
  createMdxSourceDiagnostics,
  type MdxDocumentError,
} from "@webstudio-is/content-engine/mdx";
import type {
  ContentBlockDiagnostic,
  ContentBlockExternalContentIdentity,
} from "@webstudio-is/sdk";

export const createMdxDiagnostics = ({
  identity,
  diagnostics,
}: {
  identity: ContentBlockExternalContentIdentity;
  diagnostics: readonly MdxDocumentError[];
}): ContentBlockDiagnostic[] =>
  createMdxSourceDiagnostics(diagnostics).map((diagnostic) =>
    diagnostic.code === "unsafe-mdx"
      ? {
          code: "unsafe-mdx",
          severity: diagnostic.severity,
          blockInstanceId: identity.blockInstanceId,
          assetId: identity.assetId,
          contentRef: identity.contentRef,
          renderScope: identity.renderScope,
          nodeType: diagnostic.nodeType ?? "unknown",
          reason: diagnostic.reason ?? diagnostic.message,
          sourceRange: diagnostic.sourceRange,
        }
      : {
          code: "invalid-mdx",
          severity: diagnostic.severity,
          blockInstanceId: identity.blockInstanceId,
          assetId: identity.assetId,
          contentRef: identity.contentRef,
          renderScope: identity.renderScope,
          message: diagnostic.message,
          sourceRange: diagnostic.sourceRange,
        }
  );
