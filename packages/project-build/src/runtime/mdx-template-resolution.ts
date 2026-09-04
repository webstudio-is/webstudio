/**
 * Matches authored Markdown and JSX nodes to the current Content Block
 * templates, leaving unmatched nodes available for their semantic fallback.
 */
import type {
  MdxAuthoredProp,
  MdxAuthoredNode,
  MdxDocument,
} from "@webstudio-is/content-engine/mdx";
import {
  findContentBlockTemplateContainers,
  getContentBlockTemplateName,
  getComponentByJsxName,
  getHtmlTagsFromProps,
  type ContentBlockDiagnostic,
  type ContentBlockExternalContentIdentity,
  type ContentBlockSourceRange,
  type Instance,
  type Instances,
  type Prop,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { findBlockTemplates } from "./block";
import {
  getMdxNamedTemplateComponentBinding,
  getMdxStandardTemplateKeyForInstance,
  getMdxStandardTemplateBinding,
} from "./mdx-component-adapters";

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
        propBindings?: readonly Readonly<{
          source?: Readonly<{
            nodePath: readonly number[];
            propIndex: number;
          }>;
          requiresAssetReference?: boolean;
        }>[];
        componentChildren?: Instance["children"];
      }>
    | Readonly<{
        type: "unresolved-template";
      }>
  );

export type MdxTemplateResolution = Readonly<{
  /** Present on resolver output; optional for callers that persist old inputs. */
  templateStructure?:
    | Readonly<{ status: "valid"; containerId: Instance["id"] }>
    | Readonly<{
        status: "invalid";
        reason: "missing-container" | "multiple-containers";
        containerIds: readonly Instance["id"][];
      }>;
  templateNames: readonly string[];
  references: readonly MdxTemplateReference[];
  diagnostics: readonly ContentBlockDiagnostic[];
}>;

export class InvalidMdxTemplateStructureError extends Error {
  name = "InvalidMdxTemplateStructureError";
  readonly containerCount: number;

  constructor(containerCount: number) {
    super(
      `Content Block has ${containerCount} Templates containers; exactly one is required`
    );
    this.containerCount = containerCount;
  }
}

export const assertMdxTemplateContainerCount = (containerCount: number) => {
  if (containerCount !== 1) {
    throw new InvalidMdxTemplateStructureError(containerCount);
  }
};

export const assertMdxTemplateStructure = (
  resolution: Pick<MdxTemplateResolution, "templateStructure">
) => {
  if (resolution.templateStructure?.status === "invalid") {
    assertMdxTemplateContainerCount(
      resolution.templateStructure.containerIds.length
    );
  }
};

export const resolveMdxTemplates = ({
  document,
  identity,
  instances,
  props,
  metas,
}: {
  document: MdxDocument;
  identity: ContentBlockExternalContentIdentity;
  instances: Instances;
  props?: ReadonlyMap<Prop["id"], Prop>;
  metas: ReadonlyMap<Instance["component"], WsComponentMeta>;
}): MdxTemplateResolution => {
  const blockInstance = instances.get(identity.blockInstanceId);
  const templateContainers =
    blockInstance === undefined
      ? []
      : findContentBlockTemplateContainers({ blockInstance, instances });
  const templateStructure: MdxTemplateResolution["templateStructure"] =
    templateContainers.length === 0
      ? {
          status: "invalid",
          reason: "missing-container",
          containerIds: [],
        }
      : templateContainers.length === 1
        ? { status: "valid", containerId: templateContainers[0].id }
        : {
            status: "invalid",
            reason: "multiple-containers",
            containerIds: templateContainers.map(({ id }) => id),
          };
  const htmlTagsByInstanceId =
    props === undefined ? undefined : getHtmlTagsFromProps(props);
  const templateIdsByName = new Map<string, Instance["id"][]>();
  const legacyTemplateIdsByLabel = new Map<string, Instance["id"][]>();
  const templateIdsByStandardKey = new Map<string, Instance["id"][]>();
  const templateNameById = new Map<Instance["id"], string>();
  const templateNames: string[] = [];
  for (const [template] of findBlockTemplates({
    anchor: [identity.blockInstanceId],
    instances,
  }) ?? []) {
    const name = getContentBlockTemplateName(template);
    templateNames.push(name);
    templateNameById.set(template.id, name);
    const templateIds = templateIdsByName.get(name) ?? [];
    templateIds.push(template.id);
    templateIdsByName.set(name, templateIds);
    if (template.name !== undefined && template.label !== undefined) {
      const legacyTemplateIds =
        legacyTemplateIdsByLabel.get(template.label) ?? [];
      legacyTemplateIds.push(template.id);
      legacyTemplateIdsByLabel.set(template.label, legacyTemplateIds);
    }
    const standardKey = getMdxStandardTemplateKeyForInstance({
      instance: template,
      metas,
      props,
      htmlTagsByInstanceId,
    });
    if (standardKey !== undefined) {
      const standardIds = templateIdsByStandardKey.get(standardKey) ?? [];
      standardIds.push(template.id);
      templateIdsByStandardKey.set(standardKey, standardIds);
    }
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
        const standard = getMdxStandardTemplateBinding(node);
        const templateIds =
          templateIdsByName.get(node.name) ??
          (node.syntax !== "jsx"
            ? legacyTemplateIdsByLabel.get(node.name)
            : undefined);
        if ((templateIds?.length ?? 0) > 1) {
          references.push({
            type: "unresolved-template",
            path,
            templateName: node.name,
            sourceRange: node.sourceRange,
          });
          diagnostics.push({
            code: "ambiguous-template",
            severity: "warning",
            blockInstanceId: identity.blockInstanceId,
            assetId: identity.assetId,
            contentRef: identity.contentRef,
            renderScope: identity.renderScope,
            semanticKey: `name:${node.name}`,
            templateNames: templateIds!.map(
              (templateId) => templateNameById.get(templateId) ?? node.name
            ),
            sourceRange: node.sourceRange,
          });
          continue;
        }
        if (templateIds?.length === 1) {
          const templateInstance = instances.get(templateIds[0]);
          const componentBinding =
            templateInstance === undefined
              ? undefined
              : getMdxNamedTemplateComponentBinding({
                  instance: templateInstance,
                  node,
                });
          references.push({
            type: "resolved-template",
            path,
            templateName: templateNameById.get(templateIds[0]) ?? node.name,
            props:
              componentBinding?.props.map(({ prop }) => prop) ?? node.props,
            propBindings: componentBinding?.props.map(
              ({ source, requiresAssetReference }) => ({
                source,
                requiresAssetReference,
              })
            ),
            templateInstanceId: templateIds[0],
            sourceRange: node.sourceRange,
          });
        } else {
          const standardTemplateIds =
            standard === undefined
              ? undefined
              : templateIdsByStandardKey.get(standard.key);
          if (
            standard?.key.startsWith("component:") === true &&
            standardTemplateIds?.length === 1
          ) {
            const templateInstanceId = standardTemplateIds[0];
            references.push({
              type: "resolved-template",
              path,
              templateName:
                templateNameById.get(templateInstanceId) ?? standard.key,
              props: standard.props,
              propBindings: standard.propBindings,
              componentChildren: standard.componentChildren,
              templateInstanceId,
              sourceRange: node.sourceRange,
            });
            continue;
          }
          if (
            standard?.key.startsWith("component:") === true &&
            (standardTemplateIds?.length ?? 0) > 1
          ) {
            diagnostics.push({
              code: "ambiguous-template",
              severity: "warning",
              blockInstanceId: identity.blockInstanceId,
              assetId: identity.assetId,
              contentRef: identity.contentRef,
              renderScope: identity.renderScope,
              semanticKey: standard.key,
              templateNames: standardTemplateIds!.map(
                (templateId) => templateNameById.get(templateId) ?? standard.key
              ),
              sourceRange: node.sourceRange,
            });
            continue;
          }
          if (standard?.key.startsWith("component:") === true) {
            continue;
          }
          if (
            node.syntax === "jsx" &&
            getComponentByJsxName({
              name: node.name,
              components: metas.keys(),
            }) !== undefined
          ) {
            continue;
          }
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
      } else {
        const standard = getMdxStandardTemplateBinding(node);
        const templateIds =
          standard === undefined
            ? undefined
            : templateIdsByStandardKey.get(standard.key);
        if (standard !== undefined && templateIds?.length === 1) {
          const templateInstanceId = templateIds[0];
          references.push({
            type: "resolved-template",
            path,
            templateName:
              templateNameById.get(templateInstanceId) ?? standard.key,
            props: standard.props,
            propBindings: standard.propBindings,
            componentChildren: standard.componentChildren,
            templateInstanceId,
            sourceRange: node.sourceRange,
          });
        } else if (standard !== undefined && (templateIds?.length ?? 0) > 1) {
          diagnostics.push({
            code: "ambiguous-template",
            severity: "warning",
            blockInstanceId: identity.blockInstanceId,
            assetId: identity.assetId,
            contentRef: identity.contentRef,
            renderScope: identity.renderScope,
            semanticKey: standard.key,
            templateNames: templateIds!.map(
              (templateId) => templateNameById.get(templateId) ?? standard.key
            ),
            sourceRange: node.sourceRange,
          });
        }
        if (standard?.key.startsWith("component:")) {
          continue;
        }
      }

      if (
        node.type !== "text" &&
        node.type !== "comment" &&
        node.type !== "opaque"
      ) {
        visit(node.children, path);
      }
    }
  };

  visit(document.children, []);
  return { templateStructure, templateNames, references, diagnostics };
};
