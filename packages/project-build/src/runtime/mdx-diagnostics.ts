import {
  createMdxSourceDiagnostics,
  type MdxAuthoredNode,
  type MdxDocumentError,
} from "@webstudio-is/content-engine/mdx";
import type {
  ContentBlockDiagnostic,
  ContentBlockExternalContentIdentity,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import type { MaterializedMdxAuthoredContentRoot } from "./mdx-authored-content";
import { getFragmentContentModelWarnings } from "./matcher";

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

const getMdxNodeAtPath = (
  root: MaterializedMdxAuthoredContentRoot,
  path: readonly number[]
): MdxAuthoredNode | undefined => {
  let children = root.document.children;
  let node: MdxAuthoredNode | undefined;
  for (const index of path) {
    node = children[index];
    if (node === undefined) {
      return;
    }
    children = "children" in node ? node.children : [];
  }
  return node;
};

export const createMdxContentModelDiagnostics = ({
  root,
  metas,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  metas: Map<string, WsComponentMeta>;
}): ContentBlockDiagnostic[] => {
  const provenanceByInstanceId = new Map(
    root.provenance.nodes.map((node) => [node.instanceId, node])
  );
  return getFragmentContentModelWarnings({
    fragment: root.fragment,
    metas,
  }).flatMap((warning) => {
    const provenance = provenanceByInstanceId.get(warning.instanceId);
    if (provenance === undefined) {
      return [];
    }
    return [
      {
        code: "invalid-mdx" as const,
        severity: "error" as const,
        blockInstanceId: root.identity.blockInstanceId,
        assetId: root.identity.assetId,
        contentRef: root.identity.contentRef,
        renderScope: root.identity.renderScope,
        message: warning.message,
        sourceRange: getMdxNodeAtPath(root, provenance.path)?.sourceRange,
      },
    ];
  });
};
