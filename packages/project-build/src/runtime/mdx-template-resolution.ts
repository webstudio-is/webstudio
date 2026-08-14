import type {
  MdxAuthoredProp,
  MdxAuthoredNode,
  MdxDocument,
} from "@webstudio-is/content-engine/mdx";
import {
  getInstanceName,
  type ContentBlockDiagnostic,
  type ContentBlockExternalContentIdentity,
  type ContentBlockSourceRange,
  type Instance,
  type Instances,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { findBlockTemplates } from "./block";

export type MdxTemplateReference = Readonly<{
  path: readonly number[];
  templateName: string;
  sourceRange?: ContentBlockSourceRange;
}> &
  (
    | Readonly<{
        type: "resolved-template";
        templateInstanceId: Instance["id"];
        props: readonly MdxAuthoredProp[];
      }>
    | Readonly<{
        type: "unresolved-template";
      }>
  );

export type MdxTemplateResolution = Readonly<{
  templateNames: readonly string[];
  references: readonly MdxTemplateReference[];
  diagnostics: readonly ContentBlockDiagnostic[];
}>;

export const resolveMdxTemplates = ({
  document,
  identity,
  instances,
  metas,
}: {
  document: MdxDocument;
  identity: ContentBlockExternalContentIdentity;
  instances: Instances;
  metas: ReadonlyMap<Instance["component"], WsComponentMeta>;
}): MdxTemplateResolution => {
  const templateIdsByName = new Map<string, Instance["id"][]>();
  const templateNames: string[] = [];
  for (const [template] of findBlockTemplates({
    anchor: [identity.blockInstanceId],
    instances,
  }) ?? []) {
    const name = getInstanceName({ instance: template, metas });
    templateNames.push(name);
    const templateIds = templateIdsByName.get(name) ?? [];
    templateIds.push(template.id);
    templateIdsByName.set(name, templateIds);
  }

  const references: MdxTemplateReference[] = [];
  const diagnostics: ContentBlockDiagnostic[] = [];

  const visit = (
    nodes: readonly MdxAuthoredNode[],
    parentPath: readonly number[]
  ) => {
    for (const [index, node] of nodes.entries()) {
      const path = [...parentPath, index];
      if (node.type === "template") {
        const templateIds = templateIdsByName.get(node.name);
        if (templateIds?.length === 1) {
          references.push({
            type: "resolved-template",
            path,
            templateName: node.name,
            props: node.props,
            templateInstanceId: templateIds[0],
            sourceRange: node.sourceRange,
          });
        } else {
          references.push({
            type: "unresolved-template",
            path,
            templateName: node.name,
            sourceRange: node.sourceRange,
          });
          diagnostics.push({
            code: "unresolved-template",
            severity: "warning",
            blockInstanceId: identity.blockInstanceId,
            assetId: identity.assetId,
            contentRef: identity.contentRef,
            renderScope: identity.renderScope,
            templateName: node.name,
            sourceRange: node.sourceRange,
          });
          // The unresolved marker replaces the complete subtree in the Builder,
          // and publication omits it, so descendant references are not actionable.
          continue;
        }
      }

      if (node.type !== "text" && node.type !== "comment") {
        visit(node.children, path);
      }
    }
  };

  visit(document.children, []);
  return { templateNames, references, diagnostics };
};
