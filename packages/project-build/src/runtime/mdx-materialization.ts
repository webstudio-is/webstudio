import hash from "@emotion/hash";
import { serializeJsonDeterministically } from "@webstudio-is/content-engine/compiler";
import {
  getAssetContentHash,
  type ContentBlockDiagnostic,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type WebstudioData,
  type WebstudioFragment,
  type WsComponentMeta,
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

export type MdxTemplateDependency = Readonly<{
  templateInstanceId: Instance["id"];
  templateName: string;
  revision: `sha256:${string}`;
}>;

export type MdxTemplateMaterialization = Readonly<{
  templates: readonly MaterializedMdxTemplate[];
  diagnostics: readonly ContentBlockDiagnostic[];
  dependencies: Readonly<{
    templateNames: readonly string[];
    templates: readonly MdxTemplateDependency[];
  }>;
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

export const createMdxScopeIdGenerator = ({
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

export const materializeMdxTemplates = async ({
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
}): Promise<MdxTemplateMaterialization> => {
  const materializedTemplates: MaterializedMdxTemplate[] = [];
  const diagnostics: ContentBlockDiagnostic[] = [...resolution.diagnostics];
  const sourceTemplates = new Map<
    Instance["id"],
    {
      fragment: WebstudioFragment;
      dependency: MdxTemplateDependency;
    }
  >();
  for (const reference of resolution.references) {
    if (reference.type === "unresolved-template") {
      materializedTemplates.push({
        type: "unresolved-template",
        reference,
        markerId: createMdxScopeIdGenerator({
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

    let sourceTemplate = sourceTemplates.get(reference.templateInstanceId);
    if (sourceTemplate === undefined) {
      const fragment = extractWebstudioFragment(
        data,
        reference.templateInstanceId
      );
      sourceTemplate = {
        fragment,
        dependency: {
          templateInstanceId: reference.templateInstanceId,
          templateName: reference.templateName,
          revision: `sha256:${await getAssetContentHash(
            new TextEncoder().encode(serializeJsonDeterministically(fragment))
          )}`,
        },
      };
      sourceTemplates.set(reference.templateInstanceId, sourceTemplate);
    }
    const sourceFragment = sourceTemplate.fragment;
    const materializedData = createEmptyFragmentData();
    const createId = createMdxScopeIdGenerator({
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
        for (const candidate of materializedData.props.values()) {
          if (
            candidate.id !== prop.id &&
            candidate.instanceId === materializedRootId &&
            candidate.name === authoredProp.name
          ) {
            materializedData.props.delete(candidate.id);
          }
        }
        continue;
      }
      // A persisted prop that is no longer recognized by the root's current
      // component/tag contract is stale in this template revision. An
      // authored name with no persisted history remains unknown.
      const reason =
        eligibility.reason === "unknown" && existingProp !== undefined
          ? "stale"
          : eligibility.reason;
      diagnostics.push({
        code: "ignored-template-prop",
        severity: "warning",
        blockInstanceId: identity.blockInstanceId,
        assetId: identity.assetId,
        contentRef: identity.contentRef,
        renderScope: identity.renderScope,
        templateName: reference.templateName,
        propName: authoredProp.name,
        reason,
        sourceRange: reference.sourceRange,
      });
    }

    materializedTemplates.push({
      type: "resolved-template",
      reference,
      fragment: extractWebstudioFragment(materializedData, materializedRootId),
    });
  }
  return {
    templates: materializedTemplates,
    diagnostics,
    dependencies: {
      templateNames: resolution.templateNames,
      templates: Array.from(
        sourceTemplates.values(),
        ({ dependency }) => dependency
      ),
    },
  };
};
