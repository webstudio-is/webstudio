import hash from "@emotion/hash";
import { migrateCodeTextPropMutable } from "@webstudio-is/project-migrations";
import type { AssetValueReference } from "@webstudio-is/content-engine";
import { serializeJsonDeterministically } from "@webstudio-is/content-engine/compiler";
import {
  getInstancePropName,
  getJsxPropName,
  mapAttributeNames,
} from "@webstudio-is/content-engine/jsx-attributes";
import type { MdxAuthoredProp } from "@webstudio-is/content-engine/mdx";
import {
  getAssetContentHash,
  getHtmlTagFromInstance,
  type ContentBlockDiagnostic,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type Prop,
  type WebstudioData,
  type WebstudioFragment,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  getContentModeCapabilities,
  getContentModeEditableStaticPropNames,
  getContentModePropEligibility,
} from "./content-mode-permissions";
import { findAvailableVariables } from "./data";
import {
  createWebstudioDataFromFragment,
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "./fragment";
import { createEmptyWebstudioFragment } from "./component-template";
import type {
  MdxTemplateReference,
  MdxTemplateResolution,
} from "./mdx-template-resolution";
import { createPropValue, findProp } from "./props";
import { getHtmlAttributeType } from "./html-attribute-utils";
import { parseMdxStaticProp, type MdxStaticPropType } from "./mdx-static-props";
import { getMdxPropValuePathKey } from "./mdx-asset-references";

const getMdxPropEligibility = ({
  capabilities,
  instance,
  prop,
  jsxPropName,
}: {
  capabilities: ReturnType<typeof getContentModeCapabilities>;
  instance: Instance;
  prop: Pick<Prop, "name" | "type">;
  jsxPropName?: string;
}) => {
  const contentModeEligibility = getContentModePropEligibility({
    capabilities,
    instance,
    prop: jsxPropName === undefined ? prop : { ...prop, name: jsxPropName },
  });
  if (contentModeEligibility.editable) {
    return contentModeEligibility;
  }
  if (contentModeEligibility.reason !== "unknown") {
    return contentModeEligibility;
  }
  const tag = getHtmlTagFromInstance({
    instance,
    metas: capabilities.metas,
    props: capabilities.props,
    htmlTagsByInstanceId: capabilities.htmlTagsByInstanceId,
  });
  if (tag === undefined) {
    return { editable: true } as const;
  }
  const attributeType = getHtmlAttributeType({ tag, name: prop.name });
  if (attributeType === undefined) {
    // The props panel can author arbitrary static properties. MDX accepts the
    // same names while explicit component metadata still protects design-only
    // and incompatible properties above.
    return { editable: true } as const;
  }
  return attributeType === prop.type
    ? ({ editable: true } as const)
    : ({ editable: false, reason: "incompatible" } as const);
};

const getMdxPropBinding = ({
  capabilities,
  instance,
  prop,
  existingType,
  jsxPropName,
}: {
  capabilities: ReturnType<typeof getContentModeCapabilities>;
  instance: Instance;
  prop: MdxAuthoredProp;
  existingType?: MdxStaticPropType;
  jsxPropName?: string;
}) => {
  const types: readonly MdxStaticPropType[] =
    existingType !== undefined
      ? [existingType]
      : prop.value === true
        ? ["boolean"]
        : ["string", "number", "boolean"];
  for (const type of types) {
    const binding = parseMdxStaticProp({ prop, type });
    if (
      binding !== undefined &&
      getMdxPropEligibility({
        capabilities,
        instance,
        prop: { name: prop.name, type: binding.type },
        jsxPropName,
      }).editable
    ) {
      return binding;
    }
  }
};

export type MdxJsxPropContext = Readonly<{
  acceptsHtmlAttributes: boolean;
  componentPropNames: readonly string[];
  htmlTag?: string;
  propTypes: readonly Readonly<{
    name: string;
    type: MdxStaticPropType;
  }>[];
}>;

export type MaterializedMdxTemplate =
  | Readonly<{
      type: "resolved-template";
      reference: Extract<MdxTemplateReference, { type: "resolved-template" }>;
      fragment: WebstudioFragment;
      editablePropNames: readonly string[];
      jsxPropContext: MdxJsxPropContext;
      propNameMappings: readonly Readonly<{
        jsxPropName: string;
        instancePropName: string;
      }>[];
      preservedJsxPropNames?: readonly string[];
      ignoredJsxPropNames: readonly string[];
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
  assetReferences = [],
}: {
  identity: ContentBlockExternalContentIdentity;
  resolution: MdxTemplateResolution;
  data: Omit<WebstudioData, "pages">;
  metas: Map<string, WsComponentMeta>;
  projectId: string;
  assetReferences?: readonly AssetValueReference[];
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
  const assetReferenceByPath = new Map(
    assetReferences.map((reference) => [
      reference.path.map(String).join("/"),
      reference,
    ])
  );
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
    const materializedData = createWebstudioDataFromFragment(
      createEmptyWebstudioFragment()
    );
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
    const declaredJsxPropNames = new Set(
      Object.keys(metas.get(rootInstance.component)?.props ?? {})
    );
    const htmlTag = getHtmlTagFromInstance({
      instance: rootInstance,
      metas,
      props: materializedData.props,
    });
    const acceptsHtmlAttributes = htmlTag !== undefined;
    const addIgnoredPropDiagnostic = (
      propName: string,
      reason: Extract<
        ContentBlockDiagnostic,
        { code: "ignored-template-prop" }
      >["reason"],
      sourceRange = reference.sourceRange
    ) => {
      diagnostics.push({
        code: "ignored-template-prop",
        severity: "warning",
        blockInstanceId: identity.blockInstanceId,
        assetId: identity.assetId,
        contentRef: identity.contentRef,
        renderScope: identity.renderScope,
        templateName: reference.templateName,
        propName,
        reason,
        sourceRange,
      });
    };
    const mappedRootProps = Array.from(materializedData.props.values())
      .filter((prop) => prop.instanceId === materializedRootId)
      .map((prop) => ({
        prop,
        name: getInstancePropName({
          jsxPropName: prop.name,
          componentPropNames: declaredJsxPropNames,
          acceptsHtmlAttributes,
        }),
      }));
    const canonicalRootPropNames = new Set(
      mappedRootProps.flatMap(({ prop, name }) =>
        prop.name === name ? [name] : []
      )
    );
    const normalizedAliasNames = new Set<string>();
    for (const { prop, name } of mappedRootProps) {
      if (name === prop.name) {
        continue;
      }
      if (canonicalRootPropNames.has(name) || normalizedAliasNames.has(name)) {
        materializedData.props.delete(prop.id);
        addIgnoredPropDiagnostic(prop.name, "incompatible");
        continue;
      }
      prop.name = name;
      normalizedAliasNames.add(name);
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
    const declaredPropMappings = mapAttributeNames({
      attributes: Array.from(declaredJsxPropNames, (jsxPropName) => ({
        name: jsxPropName,
        jsxPropName,
      })),
      direction: "jsx-to-instance",
      componentPropNames: declaredJsxPropNames,
      acceptsHtmlAttributes,
    });
    const declaredInstancePropNames = new Set(
      declaredPropMappings.map(({ name }) => name)
    );
    const declaredInstancePropNameByJsxName = new Map(
      declaredPropMappings.map(({ name, jsxPropName }) => [jsxPropName, name])
    );
    const declaredJsxPropNameByInstanceName = new Map(
      declaredPropMappings.map(({ name, jsxPropName }) => [name, jsxPropName])
    );
    const mappedReferenceProps = reference.props.map((prop) => ({
      ...prop,
      name: getInstancePropName({
        jsxPropName: prop.name,
        componentPropNames: declaredJsxPropNames,
        acceptsHtmlAttributes,
      }),
    }));
    const propIndexesByInstanceName = new Map<string, number[]>();
    for (const [index, prop] of mappedReferenceProps.entries()) {
      const indexes = propIndexesByInstanceName.get(prop.name) ?? [];
      indexes.push(index);
      propIndexesByInstanceName.set(prop.name, indexes);
    }
    const conflictingPropIndexes = new Set<number>();
    const collidedInstancePropNames = new Set<string>();
    for (const [instancePropName, indexes] of propIndexesByInstanceName) {
      if (indexes.length < 2) {
        continue;
      }
      collidedInstancePropNames.add(instancePropName);
      const canonicalJsxName = getJsxPropName({
        instancePropName,
        componentPropNames: declaredJsxPropNames,
        acceptsHtmlAttributes,
      });
      const orderedIndexes = indexes.toSorted((left, right) => {
        const leftIsCanonical =
          reference.props[left]?.name === canonicalJsxName;
        const rightIsCanonical =
          reference.props[right]?.name === canonicalJsxName;
        return Number(rightIsCanonical) - Number(leftIsCanonical);
      });
      const existingProp = findProp(
        materializedData.props.values(),
        materializedRootId,
        instancePropName
      );
      const selectedIndex =
        orderedIndexes.find((index) => {
          const authoredProp = reference.props[index];
          const instanceProp = mappedReferenceProps[index];
          if (authoredProp === undefined || instanceProp === undefined) {
            return false;
          }
          return (
            getMdxPropBinding({
              capabilities,
              instance: rootInstance,
              prop: instanceProp,
              jsxPropName: authoredProp.name,
              existingType:
                existingProp?.type === "string" ||
                existingProp?.type === "number" ||
                existingProp?.type === "boolean"
                  ? existingProp.type
                  : undefined,
            }) !== undefined
          );
        }) ?? orderedIndexes[0];
      for (const index of indexes) {
        if (index !== selectedIndex) {
          conflictingPropIndexes.add(index);
        }
      }
    }
    const propNameMappings: Array<{
      jsxPropName: string;
      instancePropName: string;
    }> = [];
    const ignoredJsxPropNames = new Set<string>();
    for (const [index, authoredProp] of reference.props.entries()) {
      const instanceProp = mappedReferenceProps[index];
      if (instanceProp === undefined) {
        throw new Error("Mapped MDX template prop is missing");
      }
      const instancePropName = instanceProp.name;
      if (conflictingPropIndexes.has(index)) {
        ignoredJsxPropNames.add(authoredProp.name);
        addIgnoredPropDiagnostic(
          authoredProp.name,
          "incompatible",
          authoredProp.sourceRange
        );
        continue;
      }
      const canonicalExistingProp = findProp(
        materializedData.props.values(),
        materializedRootId,
        instancePropName
      );
      const aliasedExistingProp =
        authoredProp.name === instancePropName
          ? undefined
          : findProp(
              materializedData.props.values(),
              materializedRootId,
              authoredProp.name
            );
      if (
        canonicalExistingProp !== undefined &&
        aliasedExistingProp !== undefined &&
        canonicalExistingProp.id !== aliasedExistingProp.id
      ) {
        throw new Error(
          `Multiple template properties map to "${instancePropName}"`
        );
      }
      const existingProp = canonicalExistingProp ?? aliasedExistingProp;
      const assetReference = assetReferenceByPath.get(
        getMdxPropValuePathKey({
          nodePath: reference.path,
          propIndex: index,
        })
      );
      const rawBinding =
        assetReference !== undefined
          ? ({ type: "asset", value: assetReference.assetId } as const)
          : authoredProp.value === true
            ? ({ type: "boolean", value: true } as const)
            : ({ type: "string", value: authoredProp.value } as const);
      if (
        migrateCodeTextPropMutable({
          instance: rootInstance,
          prop: createPropValue({
            id: existingProp?.id ?? "legacy-code",
            instanceId: materializedRootId,
            name: instancePropName,
            ...rawBinding,
            required: existingProp?.required,
          }),
        })
      ) {
        if (existingProp !== undefined) {
          materializedData.props.delete(existingProp.id);
        }
        continue;
      }
      const binding =
        rawBinding.type === "asset" &&
        getMdxPropEligibility({
          capabilities,
          instance: rootInstance,
          prop: { name: instancePropName, type: rawBinding.type },
          jsxPropName: authoredProp.name,
        }).editable
          ? rawBinding
          : getMdxPropBinding({
              capabilities,
              instance: rootInstance,
              prop: instanceProp,
              jsxPropName: authoredProp.name,
              existingType:
                existingProp?.type === "string" ||
                existingProp?.type === "number" ||
                existingProp?.type === "boolean"
                  ? existingProp.type
                  : undefined,
            });
      if (binding !== undefined) {
        const prop = createPropValue({
          id: existingProp?.id ?? createId(),
          instanceId: materializedRootId,
          name: instancePropName,
          ...binding,
          required: existingProp?.required,
        });
        materializedData.props.set(prop.id, prop);
        for (const candidate of materializedData.props.values()) {
          if (
            candidate.id !== prop.id &&
            candidate.instanceId === materializedRootId &&
            candidate.name === instancePropName
          ) {
            materializedData.props.delete(candidate.id);
          }
        }
        propNameMappings.push({
          jsxPropName: authoredProp.name,
          instancePropName,
        });
        continue;
      }
      const eligibility = getMdxPropEligibility({
        capabilities,
        instance: rootInstance,
        prop: { name: instancePropName, type: rawBinding.type },
        jsxPropName: authoredProp.name,
      });
      propNameMappings.push({
        jsxPropName: authoredProp.name,
        instancePropName,
      });
      // A persisted prop that is no longer recognized by the root's current
      // component/tag contract is stale in this template revision. An
      // authored name with no persisted history remains unknown.
      const reason = eligibility.editable
        ? "incompatible"
        : eligibility.reason === "unknown" && existingProp !== undefined
          ? "stale"
          : eligibility.reason;
      addIgnoredPropDiagnostic(
        authoredProp.name,
        reason,
        authoredProp.sourceRange
      );
      ignoredJsxPropNames.add(authoredProp.name);
    }

    const declaredEditablePropNames = Array.from(
      getContentModeEditableStaticPropNames({
        capabilities,
        instance: rootInstance,
      }),
      (name) => declaredInstancePropNameByJsxName.get(name) ?? name
    );
    const editablePropNames = Array.from(
      new Set([
        ...declaredEditablePropNames,
        ...Array.from(materializedData.props.values()).flatMap((prop) =>
          prop.instanceId === rootInstance.id &&
          (prop.type === "string" ||
            prop.type === "number" ||
            prop.type === "boolean") &&
          getMdxPropEligibility({
            capabilities,
            instance: rootInstance,
            prop,
            jsxPropName:
              declaredJsxPropNameByInstanceName.get(prop.name) ?? prop.name,
          }).editable
            ? [prop.name]
            : []
        ),
      ])
    );
    const editablePropNameSet = new Set(editablePropNames);
    const canonicalPropNameMappings = mapAttributeNames({
      attributes: editablePropNames.map((instancePropName) => ({
        name: instancePropName,
        instancePropName,
      })),
      direction: "instance-to-jsx",
      componentPropNames: declaredInstancePropNames,
      acceptsHtmlAttributes,
    });
    for (let index = propNameMappings.length - 1; index >= 0; index--) {
      const mapping = propNameMappings[index];
      if (
        mapping !== undefined &&
        editablePropNameSet.has(mapping.instancePropName) &&
        collidedInstancePropNames.has(mapping.instancePropName) === false
      ) {
        propNameMappings.splice(index, 1);
      }
    }
    for (const mappedProp of canonicalPropNameMappings) {
      if (collidedInstancePropNames.has(mappedProp.instancePropName)) {
        continue;
      }
      propNameMappings.push({
        jsxPropName: mappedProp.name,
        instancePropName: mappedProp.instancePropName,
      });
    }
    const propTypes = new Map<string, MdxStaticPropType>();
    for (const name of editablePropNames) {
      const propMeta = metas.get(rootInstance.component)?.props?.[
        declaredJsxPropNameByInstanceName.get(name) ?? name
      ];
      if (
        propMeta?.contentMode === true &&
        (propMeta.type === "string" ||
          propMeta.type === "number" ||
          propMeta.type === "boolean")
      ) {
        propTypes.set(name, propMeta.type);
        continue;
      }
      const existingProp = findProp(
        materializedData.props.values(),
        materializedRootId,
        name
      );
      if (
        existingProp?.type === "string" ||
        existingProp?.type === "number" ||
        existingProp?.type === "boolean"
      ) {
        propTypes.set(name, existingProp.type);
        continue;
      }
      if (htmlTag !== undefined) {
        const type = getHtmlAttributeType({ tag: htmlTag, name });
        if (type !== undefined) {
          propTypes.set(name, type);
        }
      }
    }

    materializedTemplates.push({
      type: "resolved-template",
      reference,
      fragment: extractWebstudioFragment(materializedData, materializedRootId),
      editablePropNames,
      jsxPropContext: {
        acceptsHtmlAttributes,
        componentPropNames: Array.from(declaredInstancePropNames),
        htmlTag,
        propTypes: Array.from(propTypes, ([name, type]) => ({ name, type })),
      },
      propNameMappings,
      preservedJsxPropNames: reference.props.flatMap((prop, index) => {
        const mapped = mappedReferenceProps[index];
        return mapped !== undefined &&
          collidedInstancePropNames.has(mapped.name) &&
          conflictingPropIndexes.has(index) === false
          ? [prop.name]
          : [];
      }),
      ignoredJsxPropNames: Array.from(ignoredJsxPropNames),
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
