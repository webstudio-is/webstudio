import hash from "@emotion/hash";
import type {
  ContentBlockDiagnostic,
  ContentBlockExternalContentIdentity,
  WebstudioData,
  WebstudioFragment,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  getContentModeCapabilities,
  getContentModePropEligibility,
} from "./content-mode-permissions";
import { findAvailableVariables } from "./data";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "./fragment";
import type {
  MdxTemplateReference,
  MdxTemplateResolution,
} from "./mdx-template-resolution";
import { createPropValue, findProp } from "./props";

export type MaterializedMdxTemplate =
  | Readonly<{
      type: "resolved-template";
      reference: Extract<MdxTemplateReference, { type: "resolved-template" }>;
      fragment: WebstudioFragment;
    }>
  | Readonly<{
      type: "unresolved-template";
      reference: Extract<MdxTemplateReference, { type: "unresolved-template" }>;
      markerId: string;
    }>;

export type MdxTemplateMaterialization = Readonly<{
  templates: readonly MaterializedMdxTemplate[];
  diagnostics: readonly ContentBlockDiagnostic[];
}>;

const createEmptyFragmentData = (): Omit<WebstudioData, "pages"> => ({
  instances: new Map(),
  props: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  breakpoints: new Map(),
  assets: new Map(),
});

const createScopeIdGenerator = ({
  identity,
  path,
}: {
  identity: ContentBlockExternalContentIdentity;
  path: readonly number[];
}) => {
  const scope = hash(
    JSON.stringify([
      identity.blockInstanceId,
      identity.assetId,
      identity.revision,
      identity.contentRef,
      identity.renderScope,
      path,
    ])
  );
  let index = 0;
  return () => `mdx-${scope}-${index++}`;
};

export const materializeMdxTemplates = ({
  identity,
  resolution,
  data,
  metas,
  projectId,
}: {
  identity: ContentBlockExternalContentIdentity;
  resolution: MdxTemplateResolution;
  data: Omit<WebstudioData, "pages">;
  metas: Map<string, WsComponentMeta>;
  projectId: string;
}): MdxTemplateMaterialization => {
  const materializedTemplates: MaterializedMdxTemplate[] = [];
  const diagnostics: ContentBlockDiagnostic[] = [...resolution.diagnostics];
  for (const reference of resolution.references) {
    if (reference.type === "unresolved-template") {
      materializedTemplates.push({
        type: "unresolved-template",
        reference,
        markerId: createScopeIdGenerator({
          identity,
          path: reference.path,
        })(),
      });
      continue;
    }
    if (data.instances.has(reference.templateInstanceId) === false) {
      throw new Error(
        `Resolved MDX template instance "${reference.templateInstanceId}" is missing`
      );
    }

    const sourceFragment = extractWebstudioFragment(
      data,
      reference.templateInstanceId
    );
    const materializedData = createEmptyFragmentData();
    const createId = createScopeIdGenerator({
      identity,
      path: reference.path,
    });
    const { newInstanceIds } = insertWebstudioFragmentCopy({
      data: materializedData,
      fragment: sourceFragment,
      availableVariables: findAvailableVariables({
        startingInstanceId: reference.templateInstanceId,
        instances: data.instances,
        dataSources: data.dataSources,
      }),
      projectId,
      createId,
    });
    const materializedRootId = newInstanceIds.get(reference.templateInstanceId);
    if (materializedRootId === undefined) {
      throw new Error(
        `Materialized MDX template instance "${reference.templateInstanceId}" is missing`
      );
    }
    const rootInstance = materializedData.instances.get(materializedRootId);
    if (rootInstance === undefined) {
      throw new Error(
        `Materialized MDX template root "${materializedRootId}" is missing`
      );
    }
    const capabilities = getContentModeCapabilities({
      instances: materializedData.instances,
      metas,
      props: materializedData.props,
      styleSources: materializedData.styleSources,
      styleSourceSelections: materializedData.styleSourceSelections,
      styles: materializedData.styles,
      breakpoints: materializedData.breakpoints,
      contentRootIds: new Set([materializedRootId]),
    });
    for (const authoredProp of reference.props) {
      const existingProp = findProp(
        materializedData.props.values(),
        materializedRootId,
        authoredProp.name
      );
      const propType = authoredProp.value === true ? "boolean" : "string";
      const eligibility = getContentModePropEligibility({
        capabilities,
        instance: rootInstance,
        prop: {
          name: authoredProp.name,
          type: propType,
        },
      });
      if (eligibility.editable) {
        const prop = createPropValue({
          id: existingProp?.id ?? createId(),
          instanceId: materializedRootId,
          name: authoredProp.name,
          type: propType,
          value: authoredProp.value,
          required: existingProp?.required,
        });
        materializedData.props.set(prop.id, prop);
        continue;
      }
      diagnostics.push({
        code: "ignored-template-prop",
        severity: "warning",
        blockInstanceId: identity.blockInstanceId,
        assetId: identity.assetId,
        contentRef: identity.contentRef,
        renderScope: identity.renderScope,
        templateName: reference.templateName,
        propName: authoredProp.name,
        reason: eligibility.reason,
        sourceRange: reference.sourceRange,
      });
    }

    materializedTemplates.push({
      type: "resolved-template",
      reference,
      fragment: extractWebstudioFragment(materializedData, materializedRootId),
    });
  }
  return { templates: materializedTemplates, diagnostics };
};
