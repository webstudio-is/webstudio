/**
 * Converts authored MDX nodes to editable Webstudio instances and reconciles
 * instance edits back into MDX without treating generated instance ids as source.
 */
import equal from "fast-deep-equal";
import { elementsByTag } from "@webstudio-is/html-data";
import type { AssetValueReference } from "@webstudio-is/content-engine";
import type {
  MdxAuthoredNode,
  MdxAuthoredProp,
  MdxDocument,
  MdxMode,
} from "@webstudio-is/content-engine/mdx";
import {
  preferMarkdownSyntax,
  serializeMdxDocument,
} from "@webstudio-is/content-engine/mdx";
import {
  assertUniqueAttributeNames,
  getInstancePropName,
  mapAttributeNames,
} from "@webstudio-is/content-engine/jsx-attributes";
import {
  elementComponent,
  getStyleDeclKey,
  type ContentBlockDiagnostic,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type Prop,
  type WebstudioFragment,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  createMdxScopeIdGenerator,
  getMdxPropBinding,
  getMdxPropEligibility,
  resolveMdxPropCollisions,
  type MaterializedMdxTemplate,
  type MdxJsxPropContext,
  type MdxTemplateMaterialization,
} from "./mdx-materialization";
import { getContentModeCapabilities } from "./content-mode-permissions";
import { createEmptyWebstudioFragment } from "./component-template";
import {
  createWebstudioDataFromFragment,
  extractWebstudioFragment,
} from "./fragment";
import {
  getDerivedMdxComponentPropIds,
  getMdxNamedTemplateSyntax,
  hasMdxComponentAdapter,
  materializeMdxComponent,
  normalizeMdxComponentProps,
  serializeMdxComponent,
  serializeMdxComponentFallback,
} from "./mdx-component-adapters";
import {
  parseMdxStaticProp,
  serializeMdxStaticProp,
  type MdxStaticPropType,
} from "./mdx-static-props";
import { getHtmlAttributeType } from "./html-attribute-utils";
import { getMdxPropValuePathKey } from "./mdx-asset-references";

type AuthoredElementProvenance = Readonly<{
  type: "element";
  path: readonly number[];
  instanceId: Instance["id"];
  assetProps: readonly Readonly<{
    propId: Prop["id"];
    assetId: string;
    authoredValue: string;
  }>[];
}>;

type AuthoredComponentProvenance = Readonly<{
  type: "component";
  path: readonly number[];
  instanceId: Instance["id"];
  ignoredInstancePropNames: readonly string[];
  namedJsx?: Readonly<{
    jsxPropContext: MdxJsxPropContext;
    ignoredJsxPropNames: readonly string[];
  }>;
  assetProps: AuthoredElementProvenance["assetProps"];
}>;

type TemplateProvenance = Readonly<{
  type: "template";
  binding: "semantic" | "named";
  templateName: string;
  overridesTemplateChildren: boolean;
  overlaysTemplateChildren: boolean;
  path: readonly number[];
  instanceId: Instance["id"];
  editableTextChildren: boolean;
  editablePropNames: readonly string[];
  authoredPropNames: readonly string[];
  jsxPropContext: MdxJsxPropContext;
  propNameMappings: readonly Readonly<{
    jsxPropName: string;
    instancePropName: string;
  }>[];
  preservedJsxPropNames?: readonly string[];
  ignoredJsxPropNames: readonly string[];
  expandedInstanceIds: readonly Instance["id"][];
  htmlTags: readonly Readonly<{
    instanceId: Instance["id"];
    tag: string;
  }>[];
  overlaidDescendants: readonly Readonly<{
    instanceId: Instance["id"];
    path: readonly number[];
    kind: "element" | "component";
    componentPropNames: readonly string[];
    ignoredInstancePropNames: readonly string[];
    assetProps: AuthoredElementProvenance["assetProps"];
  }>[];
  assetProps: AuthoredElementProvenance["assetProps"];
  namespaceKeys: readonly Readonly<{
    namespace: UnsupportedNamespace;
    key: string;
  }>[];
}>;

type UnsupportedNamespace = (typeof unsupportedNamespaces)[number];

const isStaticProp = (
  prop: Prop
): prop is Prop & { type: "string" | "number" | "boolean" } =>
  prop.type === "string" || prop.type === "number" || prop.type === "boolean";

const isEditableTemplateProp = ({
  provenance,
  prop,
}: {
  provenance: TemplateProvenance;
  prop: Prop;
}) => {
  const expectedTypes = provenance.jsxPropContext.propTypes.flatMap(
    ({ name, type }) => (name === prop.name ? [type] : [])
  );
  if (provenance.editablePropNames.includes(prop.name)) {
    if (prop.type === "asset") {
      return true;
    }
    return (
      expectedTypes.length === 0 ||
      (isStaticProp(prop) && expectedTypes.includes(prop.type))
    );
  }
  if (
    isStaticProp(prop) === false ||
    provenance.jsxPropContext.componentPropNames.includes(prop.name)
  ) {
    return false;
  }
  const { htmlTag } = provenance.jsxPropContext;
  const htmlType =
    htmlTag === undefined
      ? undefined
      : getHtmlAttributeType({ tag: htmlTag, name: prop.name });
  return htmlType === undefined || htmlType === prop.type;
};

const unsupportedNamespaces = [
  "assets",
  "dataSources",
  "resources",
  "breakpoints",
  "styleSourceSelections",
  "styleSources",
  "styles",
] as const;

const getNamespaceRecordKey = (
  namespace: UnsupportedNamespace,
  record: WebstudioFragment[UnsupportedNamespace][number]
) => {
  if (namespace === "styleSourceSelections") {
    return (record as WebstudioFragment["styleSourceSelections"][number])
      .instanceId;
  }
  if (namespace === "styles") {
    return getStyleDeclKey(record as WebstudioFragment["styles"][number]);
  }
  return (record as { id: string }).id;
};

const getUnsupportedNamespaceKeys = (fragments: readonly WebstudioFragment[]) =>
  Object.fromEntries(
    unsupportedNamespaces.map((namespace) => [
      namespace,
      new Set(
        fragments.flatMap((fragment) =>
          fragment[namespace].map((record) =>
            getNamespaceRecordKey(namespace, record)
          )
        )
      ),
    ])
  ) as Record<UnsupportedNamespace, Set<string>>;

export type MdxAuthoredContentProvenance = Readonly<{
  nodes: readonly (
    | AuthoredComponentProvenance
    | AuthoredElementProvenance
    | TemplateProvenance
  )[];
  unresolvedTemplates: readonly Readonly<{
    path: readonly number[];
    markerId: string;
    templateName: string;
  }>[];
}>;

export type MaterializedMdxAuthoredContentRoot = Readonly<{
  identity: ContentBlockExternalContentIdentity;
  fragment: WebstudioFragment;
  document: MdxDocument;
  resolvedFrontmatter?: Readonly<Record<string, unknown>>;
  provenance: MdxAuthoredContentProvenance;
  /** Optional so roots created by older API consumers remain serializable. */
  diagnostics?: readonly ContentBlockDiagnostic[];
  assetReferenceValues?: ReadonlyMap<string, string>;
}>;

const isMdxValueEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => isMdxValueEqual(value, right[index]))
    );
  }
  if (
    typeof left === "object" &&
    left !== null &&
    typeof right === "object" &&
    right !== null
  ) {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const bothTemplates =
      leftRecord.type === "template" && rightRecord.type === "template";
    const keys = new Set([
      ...Object.keys(leftRecord),
      ...Object.keys(rightRecord),
    ]);
    keys.delete("sourceRange");
    return Array.from(keys).every((key) => {
      if (bothTemplates && key === "syntax") {
        return (
          (leftRecord.syntax ?? "ws-element") ===
          (rightRecord.syntax ?? "ws-element")
        );
      }
      if (bothTemplates && key === "selfClosing") {
        const leftChildren = leftRecord.children as readonly unknown[];
        const rightChildren = rightRecord.children as readonly unknown[];
        return (
          (leftRecord.selfClosing ?? leftChildren.length === 0) ===
          (rightRecord.selfClosing ?? rightChildren.length === 0)
        );
      }
      return (
        key in leftRecord &&
        key in rightRecord &&
        isMdxValueEqual(leftRecord[key], rightRecord[key])
      );
    });
  }
  return false;
};

const getSourceRangeKey = (node: MdxAuthoredNode) => {
  const range = node.sourceRange;
  if (range === undefined) {
    return;
  }
  const pointKey = (point: typeof range.start) =>
    point.offset === undefined
      ? `${point.line}:${point.column}`
      : String(point.offset);
  return `${pointKey(range.start)}-${pointKey(range.end)}`;
};

const mergeLocalProps = ({
  base,
  local,
  latest,
}: {
  base: readonly MdxAuthoredProp[];
  local: readonly MdxAuthoredProp[];
  latest: readonly MdxAuthoredProp[];
}) => {
  const baseByName = new Map(base.map((prop) => [prop.name, prop]));
  const localByName = new Map(local.map((prop) => [prop.name, prop]));
  const result = latest.flatMap((prop) => {
    const baseProp = baseByName.get(prop.name);
    if (baseProp === undefined) {
      return [prop];
    }
    const localProp = localByName.get(prop.name);
    if (localProp === undefined) {
      return [];
    }
    localByName.delete(prop.name);
    return [isMdxValueEqual(baseProp, localProp) ? prop : localProp];
  });
  for (const prop of localByName.values()) {
    const baseProp = baseByName.get(prop.name);
    if (baseProp === undefined || isMdxValueEqual(baseProp, prop) === false) {
      result.push(prop);
    }
  }
  return result;
};

const mergeLocalNode = ({
  base,
  local,
  latest,
}: {
  base: MdxAuthoredNode;
  local: MdxAuthoredNode;
  latest: MdxAuthoredNode;
}): MdxAuthoredNode => {
  if (isMdxValueEqual(base, local)) {
    return latest;
  }
  if (
    base.type !== local.type ||
    base.type !== latest.type ||
    (base.type === "element" &&
      (local.type !== "element" ||
        latest.type !== "element" ||
        base.syntax !== local.syntax ||
        base.syntax !== latest.syntax))
  ) {
    return local;
  }
  if (
    base.type === "text" ||
    base.type === "comment" ||
    base.type === "opaque"
  ) {
    return local;
  }
  if (local.type === "text" || latest.type === "text") {
    return local;
  }
  if (
    "children" in base === false ||
    "children" in local === false ||
    "children" in latest === false
  ) {
    return local;
  }
  const children = mergeLocalChildren({
    base: base.children,
    local: local.children,
    latest: latest.children,
  });
  const props = mergeLocalProps({
    base: base.props,
    local: local.props,
    latest: latest.props,
  });
  const merged = { ...latest, props, children } as MdxAuthoredNode;
  const mutableFields = [
    "tag",
    "name",
    "syntax",
    "mdxMode",
    "selfClosing",
    "markdownListItem",
    "preserveTextWhitespace",
  ] as const;
  const baseRecord = base as unknown as Record<string, unknown>;
  const localRecord = local as unknown as Record<string, unknown>;
  const mergedRecord = merged as unknown as Record<string, unknown>;
  for (const field of mutableFields) {
    if (isMdxValueEqual(baseRecord[field], localRecord[field]) === false) {
      mergedRecord[field] = localRecord[field];
    }
  }
  return merged;
};

const getNodeShape = (node: MdxAuthoredNode) => {
  if (node.type === "element") {
    return `${node.type}:${node.syntax}:${node.tag}`;
  }
  if (node.type === "template") {
    return `${node.type}:${node.syntax ?? "ws-element"}:${node.name}`;
  }
  return node.type;
};

const alignNodesToBase = (
  base: readonly MdxAuthoredNode[],
  candidates: readonly MdxAuthoredNode[]
) => {
  const aligned = new Map<number, number>();
  const used = new Set<number>();
  const align = (
    accept: (baseIndex: number, candidateIndex: number) => boolean
  ) => {
    for (const [baseIndex] of base.entries()) {
      if (aligned.has(baseIndex)) {
        continue;
      }
      const candidateIndex = candidates
        .map((_, index) => index)
        .filter((index) => used.has(index) === false)
        .filter((index) => accept(baseIndex, index))
        .sort(
          (left, right) =>
            Math.abs(left - baseIndex) - Math.abs(right - baseIndex)
        )[0];
      if (candidateIndex !== undefined) {
        aligned.set(baseIndex, candidateIndex);
        used.add(candidateIndex);
      }
    }
  };
  align((baseIndex, candidateIndex) =>
    isMdxValueEqual(base[baseIndex], candidates[candidateIndex])
  );
  align(
    (baseIndex, candidateIndex) =>
      getSourceRangeKey(base[baseIndex]) !== undefined &&
      getSourceRangeKey(base[baseIndex]) ===
        getSourceRangeKey(candidates[candidateIndex])
  );
  align(
    (baseIndex, candidateIndex) =>
      getNodeShape(base[baseIndex]) === getNodeShape(candidates[candidateIndex])
  );
  align(
    (baseIndex, candidateIndex) =>
      base[baseIndex].type === candidates[candidateIndex].type
  );
  return { aligned, used };
};

const mergeLocalChildren = ({
  base,
  local,
  latest,
}: {
  base: readonly MdxAuthoredNode[];
  local: readonly MdxAuthoredNode[];
  latest: readonly MdxAuthoredNode[];
}): MdxAuthoredNode[] => {
  const localAlignment = alignNodesToBase(base, local);
  const latestAlignment = alignNodesToBase(base, latest);
  const localBaseIndexes = Array.from(localAlignment.aligned)
    .sort((left, right) => left[1] - right[1])
    .map(([baseIndex]) => baseIndex);
  const localStructureIsUnchanged =
    localAlignment.used.size === local.length &&
    localBaseIndexes.length === base.length &&
    localBaseIndexes.every((baseIndex, index) => baseIndex === index);

  if (localStructureIsUnchanged) {
    const latestBaseByIndex = new Map(
      Array.from(latestAlignment.aligned, ([baseIndex, latestIndex]) => [
        latestIndex,
        baseIndex,
      ])
    );
    return latest.flatMap((node, latestIndex) => {
      const baseIndex = latestBaseByIndex.get(latestIndex);
      if (baseIndex === undefined) {
        return [node];
      }
      const localIndex = localAlignment.aligned.get(baseIndex);
      if (localIndex === undefined) {
        return [];
      }
      return [
        mergeLocalNode({
          base: base[baseIndex],
          local: local[localIndex],
          latest: node,
        }),
      ];
    });
  }

  const latestByBaseIndex = new Map(
    Array.from(latestAlignment.aligned, ([baseIndex, latestIndex]) => [
      baseIndex,
      latest[latestIndex],
    ])
  );
  const localBaseByIndex = new Map(
    Array.from(localAlignment.aligned, ([baseIndex, localIndex]) => [
      localIndex,
      baseIndex,
    ])
  );
  const entries: Array<{ node: MdxAuthoredNode; baseIndex?: number }> = [];
  for (const [localIndex, localNode] of local.entries()) {
    const baseIndex = localBaseByIndex.get(localIndex);
    if (baseIndex === undefined) {
      entries.push({ node: localNode });
      continue;
    }
    const latestNode = latestByBaseIndex.get(baseIndex);
    if (latestNode === undefined) {
      if (isMdxValueEqual(base[baseIndex], localNode) === false) {
        entries.push({ node: localNode, baseIndex });
      }
      continue;
    }
    entries.push({
      baseIndex,
      node: mergeLocalNode({
        base: base[baseIndex],
        local: localNode,
        latest: latestNode,
      }),
    });
  }

  const latestBaseByIndex = new Map(
    Array.from(latestAlignment.aligned, ([baseIndex, latestIndex]) => [
      latestIndex,
      baseIndex,
    ])
  );
  for (const [latestIndex, node] of latest.entries()) {
    if (latestAlignment.used.has(latestIndex)) {
      continue;
    }
    const nextBaseIndex = Array.from(latestBaseByIndex)
      .filter(([index]) => index > latestIndex)
      .sort((left, right) => left[0] - right[0])
      .map(([, baseIndex]) => baseIndex)
      .find((baseIndex) =>
        entries.some((entry) => entry.baseIndex === baseIndex)
      );
    const insertionIndex =
      nextBaseIndex === undefined
        ? entries.length
        : entries.findIndex((entry) => entry.baseIndex === nextBaseIndex);
    entries.splice(insertionIndex === -1 ? entries.length : insertionIndex, 0, {
      node,
    });
  }
  return entries.map(({ node }) => node);
};

const mergeLocalMdxDocument = ({
  base,
  local,
  latest,
}: {
  base: MdxDocument;
  local: MdxDocument;
  latest: MdxDocument;
}): MdxDocument => ({
  frontmatter: isMdxValueEqual(base.frontmatter, local.frontmatter)
    ? latest.frontmatter
    : local.frontmatter,
  children: mergeLocalChildren({
    base: base.children,
    local: local.children,
    latest: latest.children,
  }),
});

export class MdxAuthoredContentConflictError extends Error {
  name = "MdxAuthoredContentConflictError";
}

const pathKey = (path: readonly number[]) => path.join(".");

const mergeRecords = <Record extends { id: string }>(
  target: Record[],
  source: readonly Record[],
  namespace: string,
  allowEqual = false
) => {
  const records = new Map(target.map((record) => [record.id, record]));
  for (const record of source) {
    const existing = records.get(record.id);
    if (existing !== undefined && (!allowEqual || !equal(existing, record))) {
      throw new Error(
        `Materialized MDX ${namespace} id "${record.id}" collides`
      );
    }
    if (existing === undefined) {
      records.set(record.id, record);
      target.push(record);
    }
  }
};

const mergeTemplateFragment = (
  target: WebstudioFragment,
  source: WebstudioFragment
) => {
  mergeRecords(target.instances, source.instances, "instance");
  mergeRecords(target.props, source.props, "prop");
  mergeRecords(target.assets, source.assets, "asset", true);
  mergeRecords(target.dataSources, source.dataSources, "data source");
  mergeRecords(target.resources, source.resources, "resource");
  mergeRecords(target.breakpoints, source.breakpoints, "breakpoint", true);
  mergeRecords(target.styleSources, source.styleSources, "style source", true);
  const selectedInstanceIds = new Set(
    target.styleSourceSelections.map(({ instanceId }) => instanceId)
  );
  for (const selection of source.styleSourceSelections) {
    if (selectedInstanceIds.has(selection.instanceId)) {
      throw new Error(
        `Materialized MDX style selection id "${selection.instanceId}" collides`
      );
    }
    selectedInstanceIds.add(selection.instanceId);
    target.styleSourceSelections.push(selection);
  }
  const styles = new Map(
    target.styles.map((style) => [getStyleDeclKey(style), style])
  );
  for (const style of source.styles) {
    const key = getStyleDeclKey(style);
    const existing = styles.get(key);
    if (existing !== undefined && !equal(existing, style)) {
      throw new Error(`Materialized MDX style "${key}" collides`);
    }
    if (existing === undefined) {
      styles.set(key, style);
      target.styles.push(style);
    }
  }
};

const createLiteralProp = ({
  id,
  instanceId,
  prop,
  assetId,
  type,
}: {
  id: string;
  instanceId: string;
  prop: MdxAuthoredProp;
  assetId?: string;
  type?: MdxStaticPropType;
}): Prop => {
  if (assetId !== undefined) {
    return {
      id,
      instanceId,
      name: prop.name,
      type: "asset",
      value: assetId,
    };
  }
  const parsed =
    type === undefined ? undefined : parseMdxStaticProp({ prop, type });
  if (parsed !== undefined) {
    return { id, instanceId, name: prop.name, ...parsed };
  }
  return prop.value === true
    ? {
        id,
        instanceId,
        name: prop.name,
        type: "boolean",
        value: true,
      }
    : {
        id,
        instanceId,
        name: prop.name,
        type: "string",
        value: prop.value,
      };
};

const getSingleTemplateRootId = (template: MaterializedMdxTemplate) => {
  if (
    template.type !== "resolved-template" ||
    template.fragment.children.length !== 1 ||
    template.fragment.children[0]?.type !== "id"
  ) {
    throw new Error("Resolved MDX template must materialize one root instance");
  }
  return template.fragment.children[0].value;
};

const isSelfClosingTemplateNode = (
  node: Extract<MdxAuthoredNode, { type: "template" }>
) => node.selfClosing ?? node.children.length === 0;

const getSourcePropName = ({
  node,
  source,
  fallback,
}: {
  node: MdxAuthoredNode;
  source:
    | Readonly<{ nodePath: readonly number[]; propIndex: number }>
    | undefined;
  fallback: string;
}) => {
  let sourceNode = node;
  for (const childIndex of source?.nodePath ?? []) {
    if (
      sourceNode.type === "text" ||
      sourceNode.type === "comment" ||
      sourceNode.type === "opaque"
    ) {
      return fallback;
    }
    const child = sourceNode.children[childIndex];
    if (child === undefined) {
      return fallback;
    }
    sourceNode = child;
  }
  if (
    source === undefined ||
    sourceNode.type === "text" ||
    sourceNode.type === "comment" ||
    sourceNode.type === "opaque"
  ) {
    return fallback;
  }
  return sourceNode.props[source.propIndex]?.name ?? fallback;
};

export const materializeMdxAuthoredContent = ({
  identity,
  document,
  templateMaterialization,
  assetReferences = [],
  assetReferenceValues,
  metas,
  createUnresolvedTemplateInstance,
}: {
  identity: ContentBlockExternalContentIdentity;
  document: MdxDocument;
  templateMaterialization: MdxTemplateMaterialization;
  assetReferences?: readonly AssetValueReference[];
  assetReferenceValues?: ReadonlyMap<string, string>;
  metas?: Map<Instance["component"], WsComponentMeta>;
  createUnresolvedTemplateInstance?: (input: {
    markerId: string;
    templateName: string;
  }) => Instance;
}): MaterializedMdxAuthoredContentRoot => {
  const fragment = createEmptyWebstudioFragment();
  const diagnostics: ContentBlockDiagnostic[] = [];
  const nodes: MdxAuthoredContentProvenance["nodes"][number][] = [];
  const templatesByPath = new Map(
    templateMaterialization.templates.map((template) => [
      pathKey(template.reference.path),
      template,
    ])
  );
  const assetReferenceByPath = new Map(
    assetReferences.map((reference) => [
      reference.path.map(String).join("/"),
      reference,
    ])
  );
  const visit = (
    authoredNodes: readonly MdxAuthoredNode[],
    parentPath: readonly number[]
  ): Instance["children"] => {
    const children: Instance["children"] = [];
    for (const [index, node] of authoredNodes.entries()) {
      const path = [...parentPath, index];
      if (node.type === "text") {
        children.push({ type: "text", value: node.value });
        continue;
      }
      if (node.type === "comment") {
        continue;
      }
      if (node.type === "opaque") {
        continue;
      }
      const template = templatesByPath.get(pathKey(path));
      if (template !== undefined) {
        if (template.type === "unresolved-template") {
          const placeholder = createUnresolvedTemplateInstance?.({
            markerId: template.markerId,
            templateName: template.reference.templateName,
          });
          if (placeholder !== undefined) {
            fragment.instances.push(placeholder);
            children.push({ type: "id", value: placeholder.id });
          }
          continue;
        }
        const rootId = getSingleTemplateRootId(template);
        const sourceRootInstance = template.fragment.instances.find(
          ({ id }) => id === rootId
        );
        if (sourceRootInstance === undefined) {
          throw new Error("Resolved MDX template root is missing");
        }
        const editableTextChildren = sourceRootInstance.children.every(
          (child) => child.type === "text"
        );
        const overridesTemplateChildren =
          node.type === "element" ||
          (node.type === "template" &&
            isSelfClosingTemplateNode(node) === false);
        let overlaysTemplateChildren = false;
        let overlaidDescendants: TemplateProvenance["overlaidDescendants"] = [];
        let resolvedFragment = template.fragment;
        if (overridesTemplateChildren) {
          resolvedFragment = structuredClone(template.fragment);
          const rootInstance = resolvedFragment.instances.find(
            ({ id }) => id === rootId
          );
          if (rootInstance === undefined) {
            throw new Error("Resolved MDX template root is missing");
          }
          const templateData =
            createWebstudioDataFromFragment(resolvedFragment);
          const reservedIds = new Set([
            ...resolvedFragment.instances.map(({ id }) => id),
            ...resolvedFragment.props.map(({ id }) => id),
            ...resolvedFragment.assets.map(({ id }) => id),
            ...resolvedFragment.dataSources.map(({ id }) => id),
            ...resolvedFragment.resources.map(({ id }) => id),
            ...resolvedFragment.breakpoints.map(({ id }) => id),
            ...resolvedFragment.styleSources.map(({ id }) => id),
          ]);
          const nextScopedId = createMdxScopeIdGenerator({ identity, path });
          const createOverlayId = () => {
            let id = nextScopedId();
            while (reservedIds.has(id)) {
              id = nextScopedId();
            }
            reservedIds.add(id);
            return id;
          };
          const overlayCapabilities =
            metas === undefined
              ? undefined
              : getContentModeCapabilities({
                  instances: templateData.instances,
                  metas,
                  props: templateData.props,
                  styleSources: templateData.styleSources,
                  styleSourceSelections: templateData.styleSourceSelections,
                  styles: templateData.styles,
                  breakpoints: templateData.breakpoints,
                  contentRootIds: new Set([rootId]),
                });
          const htmlTags = new Map(
            (
              template.htmlTags ??
              resolvedFragment.instances.flatMap((instance) =>
                instance.tag === undefined
                  ? []
                  : [{ instanceId: instance.id, tag: instance.tag }]
              )
            ).map(({ instanceId, tag }) => [instanceId, tag])
          );
          const matchedDescendants: Array<
            TemplateProvenance["overlaidDescendants"][number]
          > = [];
          const overlayDiagnostics: ContentBlockDiagnostic[] = [];
          const overlayChildren = (
            authoredNodes: readonly MdxAuthoredNode[],
            instanceChildren: Instance["children"],
            parentNodePath: readonly number[]
          ): boolean => {
            const authoredChildren: Array<{
              child: MdxAuthoredNode;
              path: number[];
              textNodes?: Array<Extract<MdxAuthoredNode, { type: "text" }>>;
            }> = [];
            authoredNodes.forEach((child, index) => {
              if (child.type === "comment") {
                return;
              }
              if (child.type === "text") {
                const previous = authoredChildren.at(-1);
                if (previous?.textNodes !== undefined) {
                  previous.textNodes.push(child);
                  return;
                }
                authoredChildren.push({
                  child,
                  path: [...parentNodePath, index],
                  textNodes: [child],
                });
                return;
              }
              authoredChildren.push({
                child,
                path: [...parentNodePath, index],
              });
            });
            if (authoredChildren.length !== instanceChildren.length) {
              return false;
            }
            const nextInstanceChildren: Instance["children"] = [];
            for (const [index, authored] of authoredChildren.entries()) {
              const instanceChild = instanceChildren[index];
              if (authored.child.type === "text") {
                if (instanceChild?.type !== "text") {
                  return false;
                }
                nextInstanceChildren.push(
                  ...(authored.textNodes ?? [authored.child]).map(
                    ({ value }) => ({ type: "text" as const, value })
                  )
                );
                continue;
              }
              if (
                authored.child.type === "opaque" ||
                instanceChild?.type !== "id"
              ) {
                return false;
              }
              const instance = templateData.instances.get(instanceChild.value);
              if (instance === undefined) {
                return false;
              }
              const adapted = materializeMdxComponent(authored.child);
              let authoredProps: readonly MdxAuthoredProp[];
              let propBindings:
                | readonly Readonly<{
                    prop: MdxAuthoredProp;
                    source?: Readonly<{
                      nodePath: readonly number[];
                      propIndex: number;
                    }>;
                    requiresAssetReference?: boolean;
                  }>[]
                | undefined;
              let authoredGrandchildren: readonly MdxAuthoredNode[] | undefined;
              let kind: "element" | "component";
              let authoredJsxPropNames: readonly string[];
              let componentPropNames: readonly string[];
              if (adapted?.component === instance.component) {
                kind = "component";
                authoredProps = adapted.props.map(({ prop }) => prop);
                authoredJsxPropNames = adapted.props.map(({ prop, source }) =>
                  getSourcePropName({
                    node: authored.child,
                    source,
                    fallback: prop.name,
                  })
                );
                propBindings = adapted.props;
                componentPropNames = Object.keys(
                  metas?.get(instance.component)?.props ?? {}
                );
              } else if (
                authored.child.type === "element" &&
                authored.child.tag ===
                  (htmlTags.get(instance.id) ?? instance.tag)
              ) {
                kind = "element";
                componentPropNames = Object.keys(
                  metas?.get(instance.component)?.props ?? {}
                );
                const declaredComponentPropNames = new Set(componentPropNames);
                authoredProps = mapAttributeNames({
                  attributes: authored.child.props,
                  direction: "jsx-to-instance",
                  acceptsHtmlAttributes: true,
                  componentPropNames: declaredComponentPropNames,
                });
                authoredJsxPropNames = authored.child.props.map(
                  ({ name }) => name
                );
                authoredGrandchildren = authored.child.children;
              } else {
                return false;
              }
              const assetProps: AuthoredElementProvenance["assetProps"][number][] =
                [];
              const ignoredInstancePropNames: string[] = [];
              authoredProps.forEach((prop, propIndex) => {
                const existing = Array.from(templateData.props.values()).find(
                  (candidate) =>
                    candidate.instanceId === instance.id &&
                    candidate.name === prop.name
                );
                const source = propBindings?.[propIndex]?.source;
                const assetReference = assetReferenceByPath.get(
                  getMdxPropValuePathKey({
                    nodePath:
                      source === undefined
                        ? authored.path
                        : [...authored.path, ...source.nodePath],
                    propIndex: source?.propIndex ?? propIndex,
                  })
                );
                if (
                  propBindings?.[propIndex]?.requiresAssetReference === true &&
                  assetReference === undefined
                ) {
                  if (existing !== undefined) {
                    templateData.props.delete(existing.id);
                  }
                  return;
                }
                let nextProp: Prop;
                if (
                  overlayCapabilities !== undefined &&
                  instance.component !== elementComponent
                ) {
                  const binding =
                    assetReference === undefined
                      ? getMdxPropBinding({
                          capabilities: overlayCapabilities,
                          instance,
                          prop,
                          existingType:
                            existing?.type === "string" ||
                            existing?.type === "number" ||
                            existing?.type === "boolean"
                              ? existing.type
                              : undefined,
                          jsxPropName: authoredJsxPropNames[propIndex],
                        })
                      : getMdxPropEligibility({
                            capabilities: overlayCapabilities,
                            instance,
                            prop: { name: prop.name, type: "asset" },
                            jsxPropName: authoredJsxPropNames[propIndex],
                          }).editable
                        ? {
                            type: "asset" as const,
                            value: assetReference.assetId,
                          }
                        : undefined;
                  if (binding === undefined) {
                    const propName =
                      authoredJsxPropNames[propIndex] ?? prop.name;
                    const eligibility = getMdxPropEligibility({
                      capabilities: overlayCapabilities,
                      instance,
                      prop: {
                        name: prop.name,
                        type:
                          existing?.type === "number" ||
                          existing?.type === "boolean"
                            ? existing.type
                            : "string",
                      },
                      jsxPropName: propName,
                    });
                    ignoredInstancePropNames.push(prop.name);
                    overlayDiagnostics.push({
                      code: "ignored-template-prop",
                      severity: "warning",
                      blockInstanceId: identity.blockInstanceId,
                      assetId: identity.assetId,
                      contentRef: identity.contentRef,
                      renderScope: identity.renderScope,
                      templateName: template.reference.templateName,
                      propName,
                      reason:
                        eligibility.editable === false
                          ? eligibility.reason
                          : "incompatible",
                      sourceRange: authored.child.sourceRange,
                    });
                    return;
                  }
                  nextProp = {
                    id: existing?.id ?? createOverlayId(),
                    instanceId: instance.id,
                    name: prop.name,
                    ...binding,
                    required: existing?.required,
                  };
                } else {
                  nextProp = createLiteralProp({
                    id: existing?.id ?? createOverlayId(),
                    instanceId: instance.id,
                    prop,
                    assetId: assetReference?.assetId,
                    type:
                      authored.child.type === "element"
                        ? getHtmlAttributeType({
                            tag: authored.child.tag,
                            name: prop.name,
                          })
                        : undefined,
                  });
                }
                templateData.props.set(nextProp.id, nextProp);
                if (
                  assetReference !== undefined &&
                  typeof prop.value === "string"
                ) {
                  assetProps.push({
                    propId: nextProp.id,
                    assetId: assetReference.assetId,
                    authoredValue: prop.value,
                  });
                }
              });
              matchedDescendants.push({
                instanceId: instance.id,
                path: authored.path,
                kind,
                componentPropNames,
                ignoredInstancePropNames,
                assetProps,
              });
              if (authoredGrandchildren !== undefined) {
                if (
                  overlayChildren(
                    authoredGrandchildren,
                    instance.children,
                    authored.path
                  ) === false
                ) {
                  return false;
                }
              } else if (adapted !== undefined) {
                instance.children = adapted.children;
              }
              nextInstanceChildren.push(instanceChild);
            }
            instanceChildren.splice(
              0,
              instanceChildren.length,
              ...nextInstanceChildren
            );
            return true;
          };
          overlaysTemplateChildren =
            node.type === "template" &&
            node.children.length > 0 &&
            template.reference.componentChildren === undefined &&
            overlayChildren(node.children, rootInstance.children, path);
          if (overlaysTemplateChildren === false) {
            matchedDescendants.length = 0;
            rootInstance.children =
              template.reference.componentChildren ??
              visit(node.children, path);
          } else {
            diagnostics.push(...overlayDiagnostics);
          }
          overlaidDescendants = matchedDescendants;
          resolvedFragment = extractWebstudioFragment(templateData, rootId);
        }
        mergeTemplateFragment(fragment, resolvedFragment);
        const mergedRootInstance = fragment.instances.find(
          ({ id }) => id === rootId
        );
        if (mergedRootInstance === undefined) {
          throw new Error("Resolved MDX template root is missing");
        }
        const ignored = new Set(template.ignoredJsxPropNames);
        const instancePropNameByJsxName = new Map(
          template.propNameMappings.map((mapping) => [
            mapping.jsxPropName,
            mapping.instancePropName,
          ])
        );
        const editablePropNames = new Set([
          ...node.props.flatMap(({ name }) => {
            const instancePropName = instancePropNameByJsxName.get(name);
            return instancePropName === undefined ? [] : [instancePropName];
          }),
          ...template.editablePropNames,
        ]);
        const assetProps: AuthoredElementProvenance["assetProps"][number][] =
          [];
        template.reference.props.forEach((prop, propIndex) => {
          const propBinding = template.reference.propBindings?.[propIndex];
          const assetReference = assetReferenceByPath.get(
            getMdxPropValuePathKey({
              nodePath:
                propBinding?.source === undefined
                  ? path
                  : [...path, ...propBinding.source.nodePath],
              propIndex: propBinding?.source?.propIndex ?? propIndex,
            })
          );
          if (assetReference === undefined) {
            return;
          }
          const instancePropName =
            instancePropNameByJsxName.get(prop.name) ?? prop.name;
          const materializedProp = fragment.props.find(
            (candidate) =>
              candidate.instanceId === rootId &&
              candidate.name === instancePropName &&
              candidate.type === "asset" &&
              candidate.value === assetReference.assetId
          );
          if (
            materializedProp !== undefined &&
            typeof prop.value === "string"
          ) {
            assetProps.push({
              propId: materializedProp.id,
              assetId: assetReference.assetId,
              authoredValue: prop.value,
            });
          }
        });
        nodes.push({
          type: "template",
          binding: node.type === "element" ? "semantic" : "named",
          templateName: template.reference.templateName,
          overridesTemplateChildren,
          overlaysTemplateChildren,
          path,
          instanceId: rootId,
          editableTextChildren,
          authoredPropNames: template.reference.props.flatMap(({ name }) => {
            const instancePropName =
              instancePropNameByJsxName.get(name) ?? name;
            return ignored.has(name) ? [] : [instancePropName];
          }),
          editablePropNames: Array.from(editablePropNames).filter(
            (name) =>
              Array.from(instancePropNameByJsxName).some(
                ([jsxName, instanceName]) =>
                  instanceName === name && ignored.has(jsxName)
              ) === false
          ),
          jsxPropContext: template.jsxPropContext,
          propNameMappings: template.propNameMappings,
          preservedJsxPropNames: template.preservedJsxPropNames,
          ignoredJsxPropNames: template.ignoredJsxPropNames,
          expandedInstanceIds: resolvedFragment.instances.map(({ id }) => id),
          htmlTags:
            template.htmlTags ??
            resolvedFragment.instances.flatMap((instance) =>
              instance.tag === undefined
                ? []
                : [{ instanceId: instance.id, tag: instance.tag }]
            ),
          overlaidDescendants,
          assetProps,
          namespaceKeys: unsupportedNamespaces.flatMap((namespace) =>
            resolvedFragment[namespace].map((record) => ({
              namespace,
              key: getNamespaceRecordKey(namespace, record),
            }))
          ),
        });
        children.push({ type: "id", value: rootId });
        continue;
      }
      const materializedComponent = materializeMdxComponent(node);
      if (materializedComponent !== undefined) {
        const createId = createMdxScopeIdGenerator({ identity, path });
        const instanceId = createId();
        const instance: Instance = {
          type: "instance",
          id: instanceId,
          component: materializedComponent.component,
          children: materializedComponent.children,
        };
        fragment.instances.push(instance);
        const componentData =
          metas === undefined
            ? undefined
            : createWebstudioDataFromFragment({
                ...createEmptyWebstudioFragment(),
                children: [{ type: "id", value: instanceId }],
                instances: [instance],
              });
        const componentCapabilities =
          componentData === undefined || metas === undefined
            ? undefined
            : getContentModeCapabilities({
                instances: componentData.instances,
                metas,
                props: componentData.props,
                styleSources: componentData.styleSources,
                styleSourceSelections: componentData.styleSourceSelections,
                styles: componentData.styles,
                breakpoints: componentData.breakpoints,
                contentRootIds: new Set([instanceId]),
              });
        const namedJsxNode =
          node.type === "template" && node.syntax === "jsx" ? node : undefined;
        const declaredJsxPropNames = new Set(
          Object.keys(metas?.get(instance.component)?.props ?? {})
        );
        const htmlTag =
          componentCapabilities?.htmlTagsByInstanceId.get(instanceId);
        // Both built-in adapters render an HTML element and accept global HTML
        // attributes independently of whether component metadata is available.
        const acceptsHtmlAttributes = true;
        const declaredInstancePropNames = new Set(
          Array.from(declaredJsxPropNames, (jsxPropName) =>
            getInstancePropName({
              jsxPropName,
              componentPropNames: declaredJsxPropNames,
              acceptsHtmlAttributes,
            })
          )
        );
        const namedJsxProps =
          namedJsxNode === undefined
            ? []
            : namedJsxNode.props.map((prop) => ({
                ...prop,
                name: getInstancePropName({
                  jsxPropName: prop.name,
                  componentPropNames: declaredJsxPropNames,
                  acceptsHtmlAttributes,
                }),
              }));
        const conflictingPropIndexes =
          namedJsxNode === undefined
            ? new Set<number>()
            : resolveMdxPropCollisions({
                authoredProps: namedJsxNode.props,
                mappedProps: namedJsxProps,
                componentPropNames: declaredJsxPropNames,
                acceptsHtmlAttributes,
                canUseProp: (index) => {
                  if (componentCapabilities === undefined) {
                    return true;
                  }
                  const authoredProp = namedJsxNode.props[index];
                  const instanceProp = namedJsxProps[index];
                  return (
                    authoredProp !== undefined &&
                    instanceProp !== undefined &&
                    getMdxPropBinding({
                      capabilities: componentCapabilities,
                      instance,
                      prop: instanceProp,
                      jsxPropName: authoredProp.name,
                    }) !== undefined
                  );
                },
              }).conflictingPropIndexes;
        const assetProps: AuthoredElementProvenance["assetProps"][number][] =
          [];
        const ignoredJsxPropNames = new Set<string>();
        const ignoredInstancePropNameByJsxName = new Map<string, string>();
        const acceptedInstancePropNames = new Set<string>();
        if (namedJsxNode !== undefined) {
          for (const index of conflictingPropIndexes) {
            const authoredProp = namedJsxNode.props[index];
            const instanceProp = namedJsxProps[index];
            if (authoredProp === undefined || instanceProp === undefined) {
              continue;
            }
            ignoredJsxPropNames.add(authoredProp.name);
            ignoredInstancePropNameByJsxName.set(
              authoredProp.name,
              instanceProp.name
            );
            diagnostics.push({
              code: "ignored-template-prop",
              severity: "warning",
              blockInstanceId: identity.blockInstanceId,
              assetId: identity.assetId,
              contentRef: identity.contentRef,
              renderScope: identity.renderScope,
              templateName: materializedComponent.component,
              propName: authoredProp.name,
              reason: "incompatible",
              sourceRange: authoredProp.sourceRange ?? node.sourceRange,
            });
          }
        }
        for (const {
          prop,
          source,
          requiresAssetReference,
        } of materializedComponent.props) {
          const sourcePropIndex =
            source?.nodePath.length === 0 ? source.propIndex : undefined;
          if (
            sourcePropIndex !== undefined &&
            conflictingPropIndexes.has(sourcePropIndex)
          ) {
            continue;
          }
          const instanceProp =
            namedJsxNode === undefined
              ? prop
              : {
                  ...prop,
                  name: getInstancePropName({
                    jsxPropName: prop.name,
                    componentPropNames: declaredJsxPropNames,
                    acceptsHtmlAttributes,
                  }),
                };
          const propId = createId();
          const assetReference =
            source === undefined
              ? undefined
              : assetReferenceByPath.get(
                  getMdxPropValuePathKey({
                    nodePath: [...path, ...source.nodePath],
                    propIndex: source.propIndex,
                  })
                );
          if (requiresAssetReference && assetReference === undefined) {
            continue;
          }
          const jsxPropName = getSourcePropName({
            node,
            source,
            fallback: prop.name,
          });
          let materializedProp: Prop;
          if (componentCapabilities === undefined) {
            materializedProp = createLiteralProp({
              id: propId,
              instanceId,
              prop: instanceProp,
              assetId: assetReference?.assetId,
            });
          } else {
            const binding =
              assetReference === undefined
                ? getMdxPropBinding({
                    capabilities: componentCapabilities,
                    instance,
                    prop: instanceProp,
                    jsxPropName,
                  })
                : getMdxPropEligibility({
                      capabilities: componentCapabilities,
                      instance,
                      prop: { name: instanceProp.name, type: "asset" },
                      jsxPropName,
                    }).editable
                  ? { type: "asset" as const, value: assetReference.assetId }
                  : undefined;
            if (binding === undefined) {
              const eligibility = getMdxPropEligibility({
                capabilities: componentCapabilities,
                instance,
                prop: { name: instanceProp.name, type: "string" },
                jsxPropName,
              });
              ignoredJsxPropNames.add(jsxPropName);
              ignoredInstancePropNameByJsxName.set(
                jsxPropName,
                instanceProp.name
              );
              diagnostics.push({
                code: "ignored-template-prop",
                severity: "warning",
                blockInstanceId: identity.blockInstanceId,
                assetId: identity.assetId,
                contentRef: identity.contentRef,
                renderScope: identity.renderScope,
                templateName: materializedComponent.component,
                propName: jsxPropName,
                reason:
                  eligibility.editable === false
                    ? eligibility.reason
                    : "incompatible",
                sourceRange:
                  sourcePropIndex === undefined
                    ? node.sourceRange
                    : (namedJsxNode?.props[sourcePropIndex]?.sourceRange ??
                      node.sourceRange),
              });
              continue;
            }
            materializedProp = {
              id: propId,
              instanceId,
              name: instanceProp.name,
              ...binding,
            };
          }
          fragment.props.push(materializedProp);
          componentData?.props.set(materializedProp.id, materializedProp);
          acceptedInstancePropNames.add(materializedProp.name);
          if (assetReference !== undefined && typeof prop.value === "string") {
            assetProps.push({
              propId: materializedProp.id,
              assetId: assetReference.assetId,
              authoredValue: prop.value,
            });
          }
        }
        nodes.push({
          type: "component",
          path,
          instanceId,
          ignoredInstancePropNames: Array.from(
            new Set(
              Array.from(ignoredInstancePropNameByJsxName.values()).filter(
                (name) => acceptedInstancePropNames.has(name) === false
              )
            )
          ),
          ...(namedJsxNode === undefined
            ? {}
            : {
                namedJsx: {
                  jsxPropContext: {
                    acceptsHtmlAttributes,
                    componentPropNames: Array.from(declaredInstancePropNames),
                    htmlTag,
                    propTypes: [],
                  },
                  ignoredJsxPropNames: Array.from(ignoredJsxPropNames),
                },
              }),
          assetProps,
        });
        children.push({ type: "id", value: instanceId });
        continue;
      }
      if (node.type === "template") {
        continue;
      }

      const createId = createMdxScopeIdGenerator({ identity, path });
      const instanceId = createId();
      const instance: Instance = {
        type: "instance",
        id: instanceId,
        component: elementComponent,
        tag: node.tag,
        children: visit(node.children, path),
      };
      fragment.instances.push(instance);
      const assetProps: AuthoredElementProvenance["assetProps"][number][] = [];
      node.props.forEach((prop, propIndex) => {
        const propId = createId();
        const assetReference = assetReferenceByPath.get(
          getMdxPropValuePathKey({ nodePath: path, propIndex })
        );
        fragment.props.push(
          createLiteralProp({
            id: propId,
            instanceId,
            prop,
            assetId: assetReference?.assetId,
            type: getHtmlAttributeType({ tag: node.tag, name: prop.name }),
          })
        );
        if (assetReference !== undefined && typeof prop.value === "string") {
          assetProps.push({
            propId,
            assetId: assetReference.assetId,
            authoredValue: prop.value,
          });
        }
      });
      nodes.push({ type: "element", path, instanceId, assetProps });
      children.push({ type: "id", value: instanceId });
    }
    return children;
  };

  fragment.children = visit(document.children, []);
  const unresolvedTemplates = templateMaterialization.templates.flatMap(
    (template) =>
      template.type === "unresolved-template"
        ? [
            {
              path: template.reference.path,
              markerId: template.markerId,
              templateName: template.reference.templateName,
            },
          ]
        : []
  );
  return {
    identity,
    fragment,
    document,
    provenance: { nodes, unresolvedTemplates },
    diagnostics,
    assetReferenceValues,
  };
};

/**
 * Advances an authored root to a newly materialized document without replacing
 * the equivalent fragment that is already being edited. The materialized root
 * supplies the new document provenance; the live fragment supplies stable IDs.
 */
export const adoptMdxAuthoredContentFragment = ({
  root,
  fragment,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  fragment: WebstudioFragment;
}): MaterializedMdxAuthoredContentRoot => {
  const sourceInstances = new Map(
    root.fragment.instances.map((instance) => [instance.id, instance])
  );
  const targetInstances = new Map(
    fragment.instances.map((instance) => [instance.id, instance])
  );
  const instanceIds = new Map<string, string>();

  const pairChildren = (
    source: Instance["children"],
    target: Instance["children"]
  ) => {
    if (source.length !== target.length) {
      throw new Error(
        `Live MDX fragment has ${target.length} children where its authored document has ${source.length}`
      );
    }
    source.forEach((child, index) => {
      const targetChild = target[index];
      if (targetChild === undefined || child.type !== targetChild.type) {
        throw new Error(
          "Live MDX fragment does not match its authored document"
        );
      }
      if (child.type === "id" && targetChild.type === "id") {
        pairInstance(child.value, targetChild.value);
      }
    });
  };
  const pairInstance = (sourceId: string, targetId: string) => {
    const mappedId = instanceIds.get(sourceId);
    if (mappedId !== undefined) {
      if (mappedId !== targetId) {
        throw new Error("Live MDX fragment reuses an authored instance");
      }
      return;
    }
    const source = sourceInstances.get(sourceId);
    const target = targetInstances.get(targetId);
    if (
      source === undefined ||
      target === undefined ||
      source.component !== target.component ||
      source.tag !== target.tag
    ) {
      throw new Error("Live MDX fragment does not match its authored document");
    }
    instanceIds.set(sourceId, targetId);
    pairChildren(source.children, target.children);
  };
  pairChildren(root.fragment.children, fragment.children);
  if (
    instanceIds.size !== root.fragment.instances.length ||
    instanceIds.size !== fragment.instances.length
  ) {
    throw new Error("Live MDX fragment contains unreachable instances");
  }

  const propIds = new Map<string, string>();
  const unusedTargetProps = new Set(fragment.props.map(({ id }) => id));
  for (const source of root.fragment.props) {
    const targetInstanceId = instanceIds.get(source.instanceId);
    const target = fragment.props.find(
      (candidate) =>
        unusedTargetProps.has(candidate.id) &&
        candidate.instanceId === targetInstanceId &&
        candidate.name === source.name &&
        candidate.type === source.type
    );
    if (target === undefined) {
      throw new Error("Live MDX fragment props do not match its document");
    }
    propIds.set(source.id, target.id);
    unusedTargetProps.delete(target.id);
  }
  if (unusedTargetProps.size > 0) {
    throw new Error("Live MDX fragment contains unexpected props");
  }

  const namespaceKeys = new Map<string, string>();
  for (const namespace of unsupportedNamespaces) {
    const sourceRecords = root.fragment[namespace];
    const targetRecords = fragment[namespace];
    if (sourceRecords.length !== targetRecords.length) {
      throw new Error(
        `Live MDX fragment ${namespace} do not match its document`
      );
    }
    sourceRecords.forEach((source, index) => {
      const target = targetRecords[index];
      if (target === undefined) {
        throw new Error(
          `Live MDX fragment ${namespace} do not match its document`
        );
      }
      namespaceKeys.set(
        `${namespace}:${getNamespaceRecordKey(namespace, source)}`,
        getNamespaceRecordKey(namespace, target)
      );
    });
  }

  const mapInstanceId = (id: string) => {
    const mapped = instanceIds.get(id);
    if (mapped === undefined) {
      throw new Error(`Live MDX fragment is missing instance "${id}"`);
    }
    return mapped;
  };
  const mapAssetProps = (assetProps: AuthoredElementProvenance["assetProps"]) =>
    assetProps.map((assetProp) => {
      const propId = propIds.get(assetProp.propId);
      if (propId === undefined) {
        throw new Error(
          `Live MDX fragment is missing prop "${assetProp.propId}"`
        );
      }
      return { ...assetProp, propId };
    });
  return {
    ...root,
    fragment,
    provenance: {
      ...root.provenance,
      nodes: root.provenance.nodes.map((node) =>
        node.type === "element"
          ? {
              ...node,
              instanceId: mapInstanceId(node.instanceId),
              assetProps: mapAssetProps(node.assetProps),
            }
          : node.type === "template"
            ? {
                ...node,
                instanceId: mapInstanceId(node.instanceId),
                assetProps: mapAssetProps(node.assetProps),
                expandedInstanceIds:
                  node.expandedInstanceIds.map(mapInstanceId),
                htmlTags: node.htmlTags.map(({ instanceId, tag }) => ({
                  instanceId: mapInstanceId(instanceId),
                  tag,
                })),
                overlaidDescendants: node.overlaidDescendants.map(
                  (descendant) => ({
                    ...descendant,
                    instanceId: mapInstanceId(descendant.instanceId),
                    assetProps: mapAssetProps(descendant.assetProps),
                  })
                ),
                namespaceKeys: node.namespaceKeys.map((entry) => {
                  const key = namespaceKeys.get(
                    `${entry.namespace}:${entry.key}`
                  );
                  if (key === undefined) {
                    throw new Error(
                      `Live MDX fragment is missing ${entry.namespace} "${entry.key}"`
                    );
                  }
                  return { ...entry, key };
                }),
              }
            : {
                ...node,
                instanceId: mapInstanceId(node.instanceId),
                assetProps: mapAssetProps(node.assetProps),
              }
      ),
    },
  };
};

const assertSupportedNamespaces = ({
  root,
  fragment,
  deletedTemplateRootIds,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  fragment: WebstudioFragment;
  deletedTemplateRootIds: ReadonlySet<string>;
}) => {
  for (const namespace of unsupportedNamespaces) {
    if (namespace === "assets" && root.assetReferenceValues !== undefined) {
      const originalById = new Map(
        root.fragment.assets.map((asset) => [asset.id, asset])
      );
      const referencedAssetIds = new Set(
        fragment.props.flatMap((prop) =>
          prop.type === "asset" ? [prop.value] : []
        )
      );
      const assetIds = new Set<string>();
      for (const asset of fragment.assets) {
        const original = originalById.get(asset.id);
        if (
          assetIds.has(asset.id) ||
          (original === undefined
            ? referencedAssetIds.has(asset.id) === false ||
              root.assetReferenceValues.has(asset.id) === false
            : equal(original, asset) === false)
        ) {
          throw new Error(
            "Changes to assets cannot be represented losslessly in MDX"
          );
        }
        assetIds.add(asset.id);
      }
      if (
        Array.from(referencedAssetIds).some(
          (assetId) => assetIds.has(assetId) === false
        )
      ) {
        throw new Error(
          "Changes to assets cannot be represented losslessly in MDX"
        );
      }
      continue;
    }
    const removableKeys = new Set<string>();
    const requiredKeys = new Set<string>();
    for (const node of root.provenance.nodes) {
      if (node.type !== "template") {
        continue;
      }
      const keys = node.namespaceKeys.flatMap((entry) =>
        entry.namespace === namespace ? [entry.key] : []
      );
      const target = deletedTemplateRootIds.has(node.instanceId)
        ? removableKeys
        : requiredKeys;
      for (const key of keys) {
        target.add(key);
      }
    }
    for (const key of requiredKeys) {
      removableKeys.delete(key);
    }
    const originalByKey = new Map(
      root.fragment[namespace].map((record) => [
        getNamespaceRecordKey(namespace, record),
        record,
      ])
    );
    const nextKeys = fragment[namespace].map((record) => {
      const key = getNamespaceRecordKey(namespace, record);
      if (!equal(originalByKey.get(key), record)) {
        throw new Error(
          `Changes to ${namespace} cannot be represented losslessly in MDX`
        );
      }
      return key;
    });
    const nextKeySet = new Set(nextKeys);
    if (
      nextKeys.length !== nextKeySet.size ||
      Array.from(originalByKey.keys()).some(
        (key) => !nextKeySet.has(key) && !removableKeys.has(key)
      ) ||
      !equal(
        nextKeys,
        Array.from(originalByKey.keys()).filter((key) => nextKeySet.has(key))
      )
    ) {
      throw new Error(
        `Changes to ${namespace} cannot be represented losslessly in MDX`
      );
    }
  }
};

const toAuthoredProps = ({
  original,
  props,
  assetProps = [],
  assetReferenceValues,
}: {
  original: readonly MdxAuthoredProp[];
  props: readonly Prop[];
  assetProps?: AuthoredElementProvenance["assetProps"];
  assetReferenceValues?: ReadonlyMap<string, string>;
}) => {
  const values = new Map<string, string | true>();
  const assetPropsById = new Map(assetProps.map((prop) => [prop.propId, prop]));
  for (const prop of props) {
    if (values.has(prop.name)) {
      throw new Error(
        `Duplicate authored prop "${prop.name}" is not supported`
      );
    }
    const authoredProp = serializeMdxStaticProp(prop);
    if (authoredProp !== undefined) {
      values.set(authoredProp.name, authoredProp.value);
    } else if (prop.type === "asset") {
      const assetProp = assetPropsById.get(prop.id);
      if (assetProp?.assetId === prop.value) {
        values.set(prop.name, assetProp.authoredValue);
        continue;
      }
      const authoredValue = assetReferenceValues?.get(prop.value);
      if (authoredValue !== undefined) {
        values.set(prop.name, authoredValue);
        continue;
      }
      throw new Error(
        `Asset prop "${prop.name}" cannot be represented losslessly in MDX`
      );
    } else {
      throw new Error(
        `Prop "${prop.name}" cannot be represented losslessly in MDX`
      );
    }
  }
  const result: MdxAuthoredProp[] = [];
  for (const prop of original) {
    const value = values.get(prop.name);
    if (value !== undefined) {
      result.push({ name: prop.name, value });
      values.delete(prop.name);
    }
  }
  for (const [name, value] of values) {
    result.push({ name, value });
  }
  return result;
};

export const reconcileMdxAuthoredContent = ({
  root,
  fragment,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  fragment: WebstudioFragment;
}): MdxDocument => {
  const deletedTemplateRootIds = new Set(
    root.provenance.nodes.flatMap((node) =>
      node.type === "template" &&
      fragment.instances.some(({ id }) => id === node.instanceId) === false
        ? [node.instanceId]
        : []
    )
  );
  assertSupportedNamespaces({ root, fragment, deletedTemplateRootIds });
  for (const [namespace, records] of [
    ["instance", fragment.instances],
    ["prop", fragment.props],
  ] as const) {
    const ids = new Set<string>();
    for (const { id } of records) {
      if (ids.has(id)) {
        throw new Error(`Duplicate authored ${namespace} id "${id}"`);
      }
      ids.add(id);
    }
  }
  const instanceById = new Map(
    fragment.instances.map((instance) => [instance.id, instance])
  );
  const originalInstanceById = new Map(
    root.fragment.instances.map((instance) => [instance.id, instance])
  );
  const indexPropsByInstanceId = (props: readonly Prop[]) => {
    const index = new Map<Instance["id"], Prop[]>();
    for (const prop of props) {
      const instanceProps = index.get(prop.instanceId) ?? [];
      instanceProps.push(prop);
      index.set(prop.instanceId, instanceProps);
    }
    return index;
  };
  const propsByInstanceId = indexPropsByInstanceId(fragment.props);
  const originalPropsByInstanceId = indexPropsByInstanceId(root.fragment.props);
  const provenanceById = new Map(
    root.provenance.nodes.map((node) => [node.instanceId, node])
  );
  const provenanceByPath = new Map(
    root.provenance.nodes.map((node) => [pathKey(node.path), node])
  );
  const originalNodeByPath = new Map<string, MdxAuthoredNode>();
  const originalPathByNode = new Map<MdxAuthoredNode, string>();
  const indexOriginal = (
    nodes: readonly MdxAuthoredNode[],
    parentPath: readonly number[]
  ) => {
    nodes.forEach((node, index) => {
      const path = [...parentPath, index];
      originalNodeByPath.set(pathKey(path), node);
      originalPathByNode.set(node, pathKey(path));
      if (
        node.type !== "text" &&
        node.type !== "comment" &&
        node.type !== "opaque"
      ) {
        indexOriginal(node.children, path);
      }
    });
  };
  indexOriginal(root.document.children, []);

  const templatesExpandedToAuthoredChildren = new Set<Instance["id"]>();
  for (const provenance of root.provenance.nodes) {
    if (provenance.type !== "template") {
      continue;
    }
    if (provenance.overlaysTemplateChildren) {
      templatesExpandedToAuthoredChildren.add(provenance.instanceId);
      continue;
    }
    const originalNode = originalNodeByPath.get(pathKey(provenance.path));
    if (
      originalNode?.type !== "template" ||
      isSelfClosingTemplateNode(originalNode) === false
    ) {
      continue;
    }
    const originalRoot = originalInstanceById.get(provenance.instanceId);
    const nextRoot = instanceById.get(provenance.instanceId);
    if (originalRoot === undefined || nextRoot === undefined) {
      continue;
    }
    const rootShellChanged =
      equal({ ...nextRoot, children: originalRoot.children }, originalRoot) ===
      false;
    if (rootShellChanged) {
      continue;
    }
    const descendantIds = provenance.expandedInstanceIds.filter(
      (id) => id !== provenance.instanceId
    );
    const childrenChanged =
      equal(nextRoot.children, originalRoot.children) === false;
    const descendantInstancesChanged = descendantIds.some(
      (id) =>
        equal(instanceById.get(id), originalInstanceById.get(id)) === false
    );
    const descendantPropsChanged = descendantIds.some(
      (id) =>
        equal(
          propsByInstanceId.get(id) ?? [],
          originalPropsByInstanceId.get(id) ?? []
        ) === false
    );
    if (
      childrenChanged ||
      descendantInstancesChanged ||
      descendantPropsChanged
    ) {
      templatesExpandedToAuthoredChildren.add(provenance.instanceId);
    }
  }

  const templateByExpandedInstanceId = new Map(
    root.provenance.nodes.flatMap((node) =>
      node.type === "template"
        ? node.expandedInstanceIds.map((id) => [id, node] as const)
        : []
    )
  );
  const htmlTagByExpandedInstanceId = new Map(
    root.provenance.nodes.flatMap((node) =>
      node.type === "template"
        ? node.htmlTags.map(({ instanceId, tag }) => [instanceId, tag] as const)
        : []
    )
  );
  const overlaidDescendantById = new Map(
    root.provenance.nodes.flatMap((node) =>
      node.type === "template"
        ? node.overlaidDescendants.map(
            (descendant) => [descendant.instanceId, descendant] as const
          )
        : []
    )
  );
  const overlaidDescendantPaths = new Set(
    Array.from(overlaidDescendantById.values(), ({ path }) => pathKey(path))
  );
  const templateInternalIds = new Set(templateByExpandedInstanceId.keys());
  const derivedTemplatePropIds = new Set<Prop["id"]>();
  for (const node of root.provenance.nodes) {
    if (node.type !== "template") {
      continue;
    }
    for (const [instance, props] of [
      [
        instanceById.get(node.instanceId),
        propsByInstanceId.get(node.instanceId) ?? [],
      ],
      [
        originalInstanceById.get(node.instanceId),
        originalPropsByInstanceId.get(node.instanceId) ?? [],
      ],
    ] as const) {
      if (instance === undefined) {
        continue;
      }
      for (const propId of getDerivedMdxComponentPropIds({
        instance,
        instanceProps: props,
      })) {
        derivedTemplatePropIds.add(propId);
      }
    }
  }
  const editableTemplatePropIds = new Set<string>();
  for (const node of root.provenance.nodes) {
    if (node.type !== "template") {
      continue;
    }
    if (instanceById.has(node.instanceId) === false) {
      const expandedIds = new Set(node.expandedInstanceIds);
      if (
        fragment.instances.some(({ id }) => expandedIds.has(id)) ||
        fragment.props.some(({ instanceId }) => expandedIds.has(instanceId))
      ) {
        throw new Error(
          "A partially deleted template cannot be represented losslessly in MDX"
        );
      }
      continue;
    }
    for (const prop of root.fragment.props) {
      if (
        prop.instanceId === node.instanceId &&
        isEditableTemplateProp({ provenance: node, prop })
      ) {
        editableTemplatePropIds.add(prop.id);
      }
    }
  }
  for (const original of root.fragment.instances) {
    const template = templateByExpandedInstanceId.get(original.id);
    const next = instanceById.get(original.id);
    const isEditableTemplateText =
      template?.instanceId === original.id &&
      template.editableTextChildren &&
      next !== undefined &&
      next.children.every((child) => child.type === "text") &&
      equal({ ...next, children: original.children }, original);
    const expandsToAuthoredChildren =
      template !== undefined &&
      templatesExpandedToAuthoredChildren.has(template.instanceId);
    if (
      templateInternalIds.has(original.id) &&
      (template?.type !== "template" ||
        deletedTemplateRootIds.has(template.instanceId) === false) &&
      isEditableTemplateText === false &&
      expandsToAuthoredChildren === false
    ) {
      if (next === undefined || !equal(next, original)) {
        throw new Error(
          "Expanded template internals cannot be represented losslessly in MDX"
        );
      }
    }
  }
  const originalPropsById = new Map(
    root.fragment.props.map((prop) => [prop.id, prop])
  );
  const templateByRootId = new Map(
    root.provenance.nodes.flatMap((node) =>
      node.type === "template" ? [[node.instanceId, node] as const] : []
    )
  );
  for (const prop of fragment.props) {
    const original = originalPropsById.get(prop.id);
    const owningTemplate =
      original === undefined
        ? undefined
        : templateByExpandedInstanceId.get(original.instanceId);
    const isAuthoredChildProp =
      original !== undefined &&
      owningTemplate !== undefined &&
      original.instanceId !== owningTemplate.instanceId &&
      templatesExpandedToAuthoredChildren.has(owningTemplate.instanceId);
    if (
      original !== undefined &&
      templateInternalIds.has(original.instanceId) &&
      isAuthoredChildProp === false &&
      !editableTemplatePropIds.has(prop.id) &&
      !derivedTemplatePropIds.has(prop.id) &&
      !equal(prop, original)
    ) {
      throw new Error(
        "Expanded template props cannot be represented losslessly in MDX"
      );
    }
    const template = templateByRootId.get(prop.instanceId);
    if (
      template !== undefined &&
      isEditableTemplateProp({ provenance: template, prop }) === false &&
      derivedTemplatePropIds.has(prop.id) === false &&
      (original === undefined || !equal(original, prop))
    ) {
      throw new Error(
        "Expanded template props cannot be represented losslessly in MDX"
      );
    }
  }
  for (const original of root.fragment.props) {
    const owningTemplate = templateByExpandedInstanceId.get(
      original.instanceId
    );
    const isAuthoredChildProp =
      owningTemplate !== undefined &&
      original.instanceId !== owningTemplate.instanceId &&
      templatesExpandedToAuthoredChildren.has(owningTemplate.instanceId);
    if (
      templateInternalIds.has(original.instanceId) &&
      isAuthoredChildProp === false &&
      deletedTemplateRootIds.has(
        templateByExpandedInstanceId.get(original.instanceId)?.instanceId ?? ""
      ) === false &&
      !editableTemplatePropIds.has(original.id) &&
      !derivedTemplatePropIds.has(original.id) &&
      fragment.props.some(({ id }) => id === original.id) === false
    ) {
      throw new Error(
        "Expanded template props cannot be represented losslessly in MDX"
      );
    }
  }
  const serializedInstanceIds = new Set<string>();
  const usesPhrasingContent = (tag: string) =>
    elementsByTag[tag]?.categories.includes("phrasing") === true;
  const getInsertedNodeMode = (children: Instance["children"]): MdxMode =>
    children.every(
      (child) =>
        child.type === "text" ||
        (child.type === "id" &&
          instanceById.get(child.value)?.tag !== undefined &&
          usesPhrasingContent(instanceById.get(child.value)?.tag ?? ""))
    )
      ? "text"
      : "flow";
  const getChildrenMode = ({
    original,
    tag,
  }: {
    original: MdxAuthoredNode | undefined;
    tag: string;
  }): MdxMode => {
    if (original?.type === "element" && original.syntax === "mdx") {
      return original.mdxMode;
    }
    return elementsByTag[tag]?.children.includes("phrasing") === true
      ? "text"
      : "flow";
  };

  const toNode = (
    instanceId: string,
    mode: MdxMode,
    active: Set<string>
  ): MdxAuthoredNode => {
    if (active.has(instanceId)) {
      throw new Error("Cyclic authored MDX instance tree");
    }
    const instance = instanceById.get(instanceId);
    if (instance === undefined) {
      throw new Error(`Authored MDX instance "${instanceId}" is missing`);
    }
    const provenance = provenanceById.get(instanceId);
    if (provenance?.type === "template") {
      if (serializedInstanceIds.has(instanceId)) {
        throw new Error(`Authored MDX instance "${instanceId}" is reused`);
      }
      const expandsToAuthoredChildren =
        templatesExpandedToAuthoredChildren.has(instanceId);
      if (expandsToAuthoredChildren) {
        serializedInstanceIds.add(instanceId);
      } else {
        for (const expandedId of provenance.expandedInstanceIds) {
          serializedInstanceIds.add(expandedId);
        }
      }
      const original = originalNodeByPath.get(pathKey(provenance.path));
      if (
        original === undefined ||
        (original.type !== "template" && original.type !== "element") ||
        (provenance.binding === "semantic") !== (original.type === "element")
      ) {
        throw new Error("Authored MDX template provenance is invalid");
      }
      const ignoredJsxPropNames = new Set(provenance.ignoredJsxPropNames);
      const instancePropNameByJsxName = new Map(
        provenance.propNameMappings.map((mapping) => [
          mapping.jsxPropName,
          mapping.instancePropName,
        ])
      );
      const componentPropNames = new Set(
        provenance.jsxPropContext.componentPropNames
      );
      const toInstancePropName = (jsxPropName: string) =>
        instancePropNameByJsxName.get(jsxPropName) ??
        getInstancePropName({
          jsxPropName,
          acceptsHtmlAttributes:
            provenance.jsxPropContext.acceptsHtmlAttributes,
          componentPropNames,
        });
      const authoredPropNames = new Set(provenance.authoredPropNames);
      const originalEditablePropsByName = new Map(
        (originalPropsByInstanceId.get(instanceId) ?? [])
          .filter((prop) => isEditableTemplateProp({ provenance, prop }))
          .map((prop) => [prop.name, prop])
      );
      const editableProps = (propsByInstanceId.get(instanceId) ?? []).filter(
        (prop) =>
          isEditableTemplateProp({ provenance, prop }) &&
          (authoredPropNames.has(prop.name) ||
            equal(originalEditablePropsByName.get(prop.name), prop) === false)
      );
      if (
        new Set(editableProps.map(({ name }) => name)).size !==
        editableProps.length
      ) {
        throw new Error("Duplicate authored template props are not supported");
      }
      const editableNames = new Set([
        ...provenance.editablePropNames,
        ...editableProps.map(({ name }) => name),
      ]);
      const authoredJsxPropNameByInstanceName = new Map(
        provenance.propNameMappings.flatMap((mapping) =>
          provenance.preservedJsxPropNames?.includes(mapping.jsxPropName)
            ? [[mapping.instancePropName, mapping.jsxPropName] as const]
            : []
        )
      );
      const jsxPropNameByInstanceName = new Map(
        mapAttributeNames({
          attributes: editableProps.map(({ name }) => ({
            name,
            instancePropName: name,
          })),
          direction: "instance-to-jsx",
          acceptsHtmlAttributes:
            provenance.jsxPropContext.acceptsHtmlAttributes,
          componentPropNames,
        }).map((mapping) => [mapping.instancePropName, mapping.name])
      );
      const nextInstancePropNameByJsxName = new Map(
        Array.from(
          jsxPropNameByInstanceName,
          ([instancePropName, jsxPropName]) => [jsxPropName, instancePropName]
        )
      );
      const toJsxName = (instancePropName: string) => {
        const jsxPropName =
          authoredJsxPropNameByInstanceName.get(instancePropName) ??
          jsxPropNameByInstanceName.get(instancePropName);
        if (jsxPropName === undefined) {
          throw new Error(
            `Template prop "${instancePropName}" has no JSX name mapping`
          );
        }
        return jsxPropName;
      };
      const nextEditable = toAuthoredProps({
        original: original.props.flatMap((prop) => {
          if (ignoredJsxPropNames.has(prop.name)) {
            return [];
          }
          const name = toInstancePropName(prop.name);
          return editableNames.has(name) ? [{ ...prop, name }] : [];
        }),
        props: editableProps,
        assetProps: provenance.assetProps,
        assetReferenceValues: root.assetReferenceValues,
      });
      const nextByName = new Map(nextEditable.map((prop) => [prop.name, prop]));
      const nextInstancePropNames = new Set(nextByName.keys());
      const boundOriginalInstancePropNames = new Set(
        original.props.flatMap((prop) =>
          ignoredJsxPropNames.has(prop.name)
            ? []
            : [toInstancePropName(prop.name)]
        )
      );
      const props = original.props.flatMap((prop) => {
        if (ignoredJsxPropNames.has(prop.name)) {
          const instancePropName = toInstancePropName(prop.name);
          return boundOriginalInstancePropNames.has(instancePropName) &&
            nextInstancePropNames.has(instancePropName) === false
            ? []
            : [prop];
        }
        const instancePropName = toInstancePropName(prop.name);
        if (editableNames.has(instancePropName) === false) {
          return [prop];
        }
        const next = nextByName.get(instancePropName);
        nextByName.delete(instancePropName);
        return next === undefined
          ? []
          : [{ ...next, name: toJsxName(next.name) }];
      });
      props.push(
        ...Array.from(nextByName.values(), (prop) => ({
          ...prop,
          name: toJsxName(prop.name),
        }))
      );
      const normalizedProps = normalizeMdxComponentProps({
        instance,
        props,
        instanceProps: propsByInstanceId.get(instanceId) ?? [],
      });
      assertUniqueAttributeNames(normalizedProps);
      let children = original.children;
      const originalInstance = originalInstanceById.get(instanceId);
      if (
        expandsToAuthoredChildren ||
        provenance.overridesTemplateChildren ||
        (provenance.editableTextChildren &&
          originalInstance !== undefined &&
          (original.children.length > 0 ||
            equal(instance.children, originalInstance.children) === false))
      ) {
        children = reconcileChildren({
          original: original.children,
          children: instance.children,
          mode:
            original.type === "element"
              ? getChildrenMode({ original, tag: original.tag })
              : original.mdxMode,
          active,
        });
      }
      if (
        provenance.binding === "semantic" &&
        normalizedProps.every(
          ({ name }) =>
            ignoredJsxPropNames.has(name) === false &&
            editableNames.has(
              instancePropNameByJsxName.get(name) ??
                nextInstancePropNameByJsxName.get(name) ??
                name
            )
        )
      ) {
        const componentNode = serializeMdxComponent({
          instance,
          props: nextEditable,
          instanceProps: propsByInstanceId.get(instanceId) ?? [],
          original,
        });
        if (componentNode !== undefined) {
          return componentNode;
        }
        const componentFallback = serializeMdxComponentFallback({
          instance,
          props: nextEditable,
          instanceProps: propsByInstanceId.get(instanceId) ?? [],
          templateName: provenance.templateName,
          mdxMode: mode,
        });
        if (componentFallback !== undefined) {
          return componentFallback;
        }
      }
      if (original.type === "element") {
        if (
          original.syntax === "markdown" &&
          equal(normalizedProps, original.props) === false
        ) {
          return {
            type: "template",
            syntax: getMdxNamedTemplateSyntax({
              templateName: provenance.templateName,
              component: instance.component,
            }),
            selfClosing: false,
            name: provenance.templateName,
            props: normalizedProps,
            children,
            mdxMode: getChildrenMode({ original, tag: original.tag }),
            sourceRange: original.sourceRange,
          };
        }
        return { ...original, props: normalizedProps, children };
      }
      if (expandsToAuthoredChildren) {
        return {
          ...original,
          selfClosing: false,
          props: normalizedProps,
          children,
          mdxMode:
            mode === "text" ||
            (provenance.editableTextChildren && children.length > 0)
              ? "text"
              : original.mdxMode,
        };
      }
      return mode === "text" ||
        (provenance.editableTextChildren && children.length > 0)
        ? { ...original, props: normalizedProps, children, mdxMode: "text" }
        : { ...original, props: normalizedProps, children };
    }
    const owningTemplate = templateByExpandedInstanceId.get(instanceId);
    const isExpandedTemplateDescendant =
      owningTemplate !== undefined &&
      owningTemplate.instanceId !== instanceId &&
      templatesExpandedToAuthoredChildren.has(owningTemplate.instanceId);
    if (isExpandedTemplateDescendant) {
      const originalInstance = originalInstanceById.get(instanceId);
      if (
        originalInstance === undefined ||
        originalInstance.component !== instance.component ||
        originalInstance.label !== instance.label
      ) {
        throw new Error(
          "Template descendant metadata cannot be represented losslessly in MDX"
        );
      }
      const descendantProvenance = overlaidDescendantById.get(instanceId);
      const originalNode =
        descendantProvenance === undefined
          ? undefined
          : originalNodeByPath.get(pathKey(descendantProvenance.path));
      if (
        originalNode !== undefined &&
        (originalNode.type === "text" ||
          originalNode.type === "comment" ||
          originalNode.type === "opaque")
      ) {
        throw new Error("Overlaid template descendant provenance is invalid");
      }
      const originalProps = originalPropsByInstanceId.get(instanceId) ?? [];
      const currentProps = propsByInstanceId.get(instanceId) ?? [];
      // Removing a descendant prop resets its authored override and lets the
      // current template default apply again on the next materialization.
      const originalPropsById = new Map(
        originalProps.map((prop) => [prop.id, prop])
      );
      const originalComponent =
        descendantProvenance?.kind === "component" && originalNode !== undefined
          ? materializeMdxComponent(originalNode)
          : undefined;
      if (
        descendantProvenance?.kind === "component" &&
        originalComponent?.component !== instance.component
      ) {
        throw new Error("Overlaid template component provenance is invalid");
      }
      const originalAuthoredProps =
        originalNode === undefined
          ? []
          : descendantProvenance?.kind === "component"
            ? (originalComponent?.props.map(({ prop }) => prop) ?? [])
            : mapAttributeNames({
                attributes: originalNode.props,
                direction: "jsx-to-instance",
                acceptsHtmlAttributes: true,
                componentPropNames: new Set(
                  descendantProvenance?.componentPropNames ?? []
                ),
              });
      const ignoredInstancePropNames = new Set(
        descendantProvenance?.ignoredInstancePropNames ?? []
      );
      for (const prop of currentProps) {
        if (
          ignoredInstancePropNames.has(prop.name) &&
          equal(originalPropsById.get(prop.id), prop) === false
        ) {
          throw new Error(
            "Ignored template descendant props cannot be represented losslessly in MDX"
          );
        }
      }
      const authoredPropNames = new Set(
        originalAuthoredProps.flatMap(({ name }) =>
          ignoredInstancePropNames.has(name) ? [] : [name]
        )
      );
      const changedProps = currentProps.filter(
        (prop) =>
          ignoredInstancePropNames.has(prop.name) === false &&
          (authoredPropNames.has(prop.name) ||
            equal(originalPropsById.get(prop.id), prop) === false)
      );
      const editableAuthoredProps = toAuthoredProps({
        original: originalAuthoredProps.filter(
          ({ name }) => ignoredInstancePropNames.has(name) === false
        ),
        props: changedProps,
        assetProps: descendantProvenance?.assetProps,
        assetReferenceValues: root.assetReferenceValues,
      });
      const editableAuthoredPropsByName = new Map(
        editableAuthoredProps.map((prop) => [prop.name, prop])
      );
      const authoredProps = originalAuthoredProps.flatMap((prop) => {
        if (ignoredInstancePropNames.has(prop.name)) {
          return [prop];
        }
        const next = editableAuthoredPropsByName.get(prop.name);
        editableAuthoredPropsByName.delete(prop.name);
        return next === undefined ? [] : [next];
      });
      authoredProps.push(...editableAuthoredPropsByName.values());
      if (serializedInstanceIds.has(instanceId)) {
        throw new Error(`Authored MDX instance "${instanceId}" is reused`);
      }
      serializedInstanceIds.add(instanceId);
      if (descendantProvenance?.kind === "component") {
        const componentNode =
          originalNode?.type === "template" ||
          (authoredProps.length === 0 && instance.children.length === 0)
            ? serializeMdxComponentFallback({
                instance,
                props: authoredProps,
                instanceProps: currentProps,
                templateName:
                  originalNode?.type === "template"
                    ? originalNode.name
                    : undefined,
                mdxMode:
                  originalNode?.type === "template"
                    ? originalNode.mdxMode
                    : mode,
              })
            : (serializeMdxComponent({
                instance,
                props: authoredProps,
                instanceProps: currentProps,
                original: originalNode,
              }) ??
              serializeMdxComponentFallback({
                instance,
                props: authoredProps,
                instanceProps: currentProps,
                mdxMode: mode,
              }));
        if (componentNode === undefined) {
          throw new Error(
            `Template component descendant "${instanceId}" cannot be represented losslessly in MDX`
          );
        }
        return componentNode;
      }
      const tag =
        instance.component === elementComponent
          ? instance.tag
          : (htmlTagByExpandedInstanceId.get(instanceId) ?? instance.tag);
      if (tag === undefined) {
        throw new Error(
          `Template descendant "${instanceId}" has no deterministic HTML tag`
        );
      }
      active.add(instanceId);
      const children = reconcileChildren({
        original: originalNode?.children ?? [],
        children: instance.children,
        mode:
          elementsByTag[tag]?.children.includes("phrasing") === true
            ? "text"
            : "flow",
        active,
      });
      active.delete(instanceId);
      const props = mapAttributeNames({
        attributes: authoredProps,
        direction: "instance-to-jsx",
        acceptsHtmlAttributes: true,
        componentPropNames: new Set(
          descendantProvenance?.componentPropNames ?? []
        ),
      });
      return {
        type: "element",
        syntax: "mdx",
        tag,
        props,
        children,
        mdxMode: getInsertedNodeMode(instance.children),
      };
    }
    const instanceProps = propsByInstanceId.get(instanceId) ?? [];
    const componentProvenance =
      provenance?.type === "component" ? provenance : undefined;
    const originalComponentNode =
      componentProvenance === undefined
        ? undefined
        : originalNodeByPath.get(pathKey(componentProvenance.path));
    const originalComponent =
      originalComponentNode === undefined
        ? undefined
        : materializeMdxComponent(originalComponentNode);
    const originalComponentProps =
      originalComponent?.component === instance.component
        ? originalComponent.props.map(({ prop }) => prop)
        : [];
    const namedJsxProvenance = componentProvenance?.namedJsx;
    const namedJsxComponentPropNames = new Set(
      namedJsxProvenance?.jsxPropContext.componentPropNames ?? []
    );
    const toNamedJsxInstancePropName = (jsxPropName: string) =>
      namedJsxProvenance === undefined
        ? jsxPropName
        : getInstancePropName({
            jsxPropName,
            acceptsHtmlAttributes:
              namedJsxProvenance.jsxPropContext.acceptsHtmlAttributes,
            componentPropNames: namedJsxComponentPropNames,
          });
    const ignoredJsxPropNames = new Set(
      namedJsxProvenance?.ignoredJsxPropNames ?? []
    );
    const ignoredInstancePropNames = new Set(
      componentProvenance?.ignoredInstancePropNames ?? []
    );
    if (instanceProps.some(({ name }) => ignoredInstancePropNames.has(name))) {
      throw new Error(
        "Ignored authored component props cannot be represented losslessly in MDX"
      );
    }
    const editableAuthoredComponentProps =
      instance.component === elementComponent
        ? []
        : toAuthoredProps({
            original:
              namedJsxProvenance === undefined
                ? originalComponentProps.filter(
                    ({ name }) => ignoredInstancePropNames.has(name) === false
                  )
                : originalComponentProps.flatMap((prop) =>
                    ignoredJsxPropNames.has(prop.name)
                      ? []
                      : [
                          {
                            ...prop,
                            name: toNamedJsxInstancePropName(prop.name),
                          },
                        ]
                  ),
            props: instanceProps,
            assetProps: componentProvenance?.assetProps,
            assetReferenceValues: root.assetReferenceValues,
          });
    const editableAuthoredComponentPropsByName = new Map(
      editableAuthoredComponentProps.map((prop) => [prop.name, prop])
    );
    const authoredComponentProps =
      instance.component === elementComponent
        ? []
        : namedJsxProvenance !== undefined
          ? editableAuthoredComponentProps
          : originalComponentProps
              .flatMap((prop) => {
                if (ignoredInstancePropNames.has(prop.name)) {
                  return [prop];
                }
                const next = editableAuthoredComponentPropsByName.get(
                  prop.name
                );
                editableAuthoredComponentPropsByName.delete(prop.name);
                return next === undefined ? [] : [next];
              })
              .concat(...editableAuthoredComponentPropsByName.values());
    const preferComponentReference =
      instance.children.length === 0 &&
      instanceProps.length === 0 &&
      (componentProvenance === undefined ||
        originalComponentNode?.type === "template");
    const componentNode =
      instance.component === elementComponent ||
      preferComponentReference ||
      namedJsxProvenance !== undefined
        ? undefined
        : serializeMdxComponent({
            instance,
            props: authoredComponentProps,
            instanceProps,
            original: originalComponentNode,
          });
    const serializedComponent =
      componentNode ??
      serializeMdxComponentFallback({
        instance,
        props: authoredComponentProps,
        instanceProps,
        jsxPropContext: namedJsxProvenance?.jsxPropContext,
      });
    const sourcePreservingComponent =
      namedJsxProvenance === undefined ||
      serializedComponent === undefined ||
      originalComponentNode?.type !== "template" ||
      serializedComponent.type !== "template"
        ? serializedComponent
        : (() => {
            const nextPropsByInstanceName = new Map(
              serializedComponent.props.map((prop) => [
                toNamedJsxInstancePropName(prop.name),
                prop,
              ])
            );
            const nextInstancePropNames = new Set(
              nextPropsByInstanceName.keys()
            );
            const boundOriginalInstancePropNames = new Set(
              originalComponentNode.props.flatMap((prop) =>
                ignoredJsxPropNames.has(prop.name)
                  ? []
                  : [toNamedJsxInstancePropName(prop.name)]
              )
            );
            const props = originalComponentNode.props.flatMap((prop) => {
              if (ignoredJsxPropNames.has(prop.name)) {
                const instancePropName = toNamedJsxInstancePropName(prop.name);
                return boundOriginalInstancePropNames.has(instancePropName) &&
                  nextInstancePropNames.has(instancePropName) === false
                  ? []
                  : [prop];
              }
              const instancePropName = toNamedJsxInstancePropName(prop.name);
              const next = nextPropsByInstanceName.get(instancePropName);
              nextPropsByInstanceName.delete(instancePropName);
              return next === undefined ? [] : [{ ...next, name: prop.name }];
            });
            props.push(...nextPropsByInstanceName.values());
            assertUniqueAttributeNames(props);
            return {
              ...serializedComponent,
              name: originalComponentNode.name,
              props,
              sourceRange: originalComponentNode.sourceRange,
              selfClosing:
                serializedComponent.children.length === 0
                  ? originalComponentNode.selfClosing
                  : serializedComponent.selfClosing,
            };
          })();
    if (sourcePreservingComponent !== undefined) {
      if (serializedInstanceIds.has(instanceId)) {
        throw new Error(`Authored MDX instance "${instanceId}" is reused`);
      }
      if (
        provenance !== undefined &&
        (provenance.type !== "component" ||
          originalInstanceById.get(instanceId)?.component !==
            instance.component)
      ) {
        throw new Error("Authored MDX component provenance is invalid");
      }
      serializedInstanceIds.add(instanceId);
      return sourcePreservingComponent;
    }
    if (instance.component !== elementComponent || instance.tag === undefined) {
      throw new Error(
        `Instance "${instanceId}" cannot be represented losslessly in MDX`
      );
    }
    if (serializedInstanceIds.has(instanceId)) {
      throw new Error(`Authored MDX instance "${instanceId}" is reused`);
    }
    serializedInstanceIds.add(instanceId);
    const original =
      provenance?.type === "element"
        ? originalNodeByPath.get(pathKey(provenance.path))
        : undefined;
    if (
      original !== undefined &&
      (original.type === "text" ||
        original.type === "comment" ||
        original.type === "opaque" ||
        original.type === "template")
    ) {
      throw new Error("Authored MDX element provenance is invalid");
    }
    if (original !== undefined) {
      const originalInstance = originalInstanceById.get(instanceId);
      if (
        originalInstance?.component !== instance.component ||
        originalInstance.tag !== instance.tag ||
        originalInstance.label !== instance.label
      ) {
        throw new Error(
          "Element metadata cannot be represented losslessly in MDX"
        );
      }
    }
    active.add(instanceId);
    const children = reconcileChildren({
      original: original?.children ?? [],
      children: instance.children,
      mode: getChildrenMode({ original, tag: instance.tag }),
      active,
    });
    active.delete(instanceId);
    const props = toAuthoredProps({
      original: original?.props ?? [],
      props: propsByInstanceId.get(instanceId) ?? [],
      assetProps:
        provenance?.type === "element" ? provenance.assetProps : undefined,
      assetReferenceValues: root.assetReferenceValues,
    });
    if (original !== undefined) {
      if (original.syntax === "mdx") {
        const contentMode = getInsertedNodeMode(instance.children);
        if (contentMode === "flow" && mode === "text") {
          throw new Error(
            "Block content cannot be represented inside inline MDX"
          );
        }
        return {
          ...original,
          props,
          children,
          mdxMode:
            original.mdxMode === "flow" && mode === "flow"
              ? "flow"
              : contentMode,
        };
      }
      return { ...original, props, children };
    }
    const element = {
      type: "element",
      syntax: "mdx",
      tag: instance.tag,
      props,
      children,
      mdxMode: getInsertedNodeMode(instance.children),
    } as const;
    return element;
  };

  const reconcileChildren = ({
    original,
    children,
    mode,
    active,
  }: {
    original: readonly MdxAuthoredNode[];
    children: Instance["children"];
    mode: MdxMode;
    active: Set<string>;
  }): MdxAuthoredNode[] => {
    const textPaths = original
      .map((node, index) => ({ node, key: `text:${index}` }))
      .filter(({ node }) => node.type === "text");
    const unusedTextPaths = [...textPaths];
    const rendered = children.map((child) => {
      if (child.type === "expression") {
        throw new Error(
          "Expression text cannot be represented losslessly in MDX"
        );
      }
      if (child.type === "text") {
        const exactIndex = unusedTextPaths.findIndex(
          ({ node }) => node.type === "text" && node.value === child.value
        );
        const [entry] = unusedTextPaths.splice(
          exactIndex === -1 ? 0 : exactIndex,
          1
        );
        const node: MdxAuthoredNode =
          entry?.node.type === "text"
            ? { ...entry.node, value: child.value }
            : { type: "text", value: child.value };
        return { key: entry?.key, node };
      }
      const provenance = provenanceById.get(child.value);
      const authoredPath =
        provenance?.path ?? overlaidDescendantById.get(child.value)?.path;
      return {
        key:
          authoredPath === undefined
            ? undefined
            : `node:${pathKey(authoredPath)}`,
        node: toNode(child.value, mode, active),
      };
    });
    const surviving = new Set(
      rendered.flatMap(({ key }) => (key ? [key] : []))
    );
    const anchorsByKey = new Map<string, MdxAuthoredNode[]>();
    const tail: MdxAuthoredNode[] = [];
    let pending: MdxAuthoredNode[] = [];
    for (const [index, node] of original.entries()) {
      const originalPath = originalPathByNode.get(node);
      const provenance =
        originalPath === undefined
          ? undefined
          : provenanceByPath.get(originalPath);
      const isOverlaidDescendant =
        originalPath !== undefined && overlaidDescendantPaths.has(originalPath);
      const key =
        node.type === "text"
          ? `text:${index}`
          : provenance === undefined && isOverlaidDescendant === false
            ? undefined
            : `node:${originalPath}`;
      if (key !== undefined && surviving.has(key)) {
        anchorsByKey.set(key, pending);
        pending = [];
      } else if (key === undefined) {
        pending.push(node);
      }
    }
    tail.push(...pending);
    return [
      ...rendered.flatMap(({ key, node }) => [
        ...(key === undefined ? [] : (anchorsByKey.get(key) ?? [])),
        node,
      ]),
      ...tail,
    ];
  };

  const children = reconcileChildren({
    original: root.document.children,
    children: fragment.children,
    mode: "flow",
    active: new Set(),
  });
  if (
    fragment.instances.some(({ id }) => serializedInstanceIds.has(id) === false)
  ) {
    throw new Error(
      "Unreachable instances cannot be represented losslessly in MDX"
    );
  }
  if (
    fragment.props.some(
      ({ instanceId }) => serializedInstanceIds.has(instanceId) === false
    )
  ) {
    throw new Error("Orphan props cannot be represented losslessly in MDX");
  }
  return {
    ...root.document,
    children,
  };
};

const transientEmptyMarkdownTags = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "ul",
  "ol",
  "li",
]);

/**
 * Markdown cannot distinguish an empty editable draft from authored empty
 * syntax. Keep newly inserted empty Markdown containers in memory until they
 * contain content, while preserving empty nodes that already came from MDX.
 */
export const omitTransientEmptyMarkdownDrafts = ({
  root,
  fragment,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  fragment: WebstudioFragment;
}): WebstudioFragment => {
  const authoredInstanceIds = new Set(
    root.provenance.nodes.flatMap((node) =>
      node.type === "template" ? node.expandedInstanceIds : [node.instanceId]
    )
  );
  const instanceIdsWithProps = new Set(
    fragment.props.map(({ instanceId }) => instanceId)
  );
  const instanceIdsWithStyleSources = new Set(
    fragment.styleSourceSelections.map(({ instanceId }) => instanceId)
  );
  const referenceCountByInstanceId = new Map<string, number>();
  for (const child of [
    ...fragment.children,
    ...fragment.instances.flatMap(({ children }) => children),
  ]) {
    if (child.type === "id") {
      referenceCountByInstanceId.set(
        child.value,
        (referenceCountByInstanceId.get(child.value) ?? 0) + 1
      );
    }
  }
  const instancesById = new Map(
    fragment.instances.map((instance) => [instance.id, instance])
  );
  const omittedIds = new Set<string>();
  const visiting = new Set<string>();
  const isTransientEmpty = (instanceId: string): boolean => {
    if (omittedIds.has(instanceId)) {
      return true;
    }
    const instance = instancesById.get(instanceId);
    if (
      instance === undefined ||
      instance.component !== elementComponent ||
      transientEmptyMarkdownTags.has(instance.tag ?? "") === false ||
      referenceCountByInstanceId.get(instance.id) !== 1 ||
      authoredInstanceIds.has(instance.id) ||
      instanceIdsWithProps.has(instance.id) ||
      instanceIdsWithStyleSources.has(instance.id) ||
      visiting.has(instance.id)
    ) {
      return false;
    }
    visiting.add(instance.id);
    const isEmpty = instance.children.every(
      (child) => child.type === "id" && isTransientEmpty(child.value)
    );
    visiting.delete(instance.id);
    if (isEmpty) {
      omittedIds.add(instance.id);
    }
    return isEmpty;
  };
  for (const instance of fragment.instances) {
    isTransientEmpty(instance.id);
  }
  if (omittedIds.size === 0) {
    return fragment;
  }
  const omitChildren = (children: WebstudioFragment["children"]) =>
    children.filter(
      (child) => child.type !== "id" || omittedIds.has(child.value) === false
    );
  return {
    ...fragment,
    children: omitChildren(fragment.children),
    instances: fragment.instances
      .filter(({ id }) => omittedIds.has(id) === false)
      .map((instance) => ({
        ...instance,
        children: omitChildren(instance.children),
      })),
  };
};

export const serializeMdxAuthoredContent = async ({
  root,
  fragment,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  fragment: WebstudioFragment;
}) =>
  serializeMdxDocument(
    await preferMarkdownSyntax(
      reconcileMdxAuthoredContent({
        root,
        fragment: omitTransientEmptyMarkdownDrafts({ root, fragment }),
      })
    )
  );

export const serializeMdxTemplateInsertion = async ({
  identity,
  fragment,
  templateName,
  assetReferenceValues,
  inheritTemplateDefaults = false,
  pristineFragment,
  htmlTags = [],
}: {
  identity: ContentBlockExternalContentIdentity;
  fragment: WebstudioFragment;
  templateName: string;
  assetReferenceValues?: ReadonlyMap<string, string>;
  inheritTemplateDefaults?: boolean;
  pristineFragment?: WebstudioFragment;
  htmlTags?: readonly Readonly<{
    instanceId: Instance["id"];
    tag: string;
  }>[];
}): Promise<MdxDocument> => {
  const root = fragment.children[0];
  const rootInstance =
    root?.type === "id"
      ? fragment.instances.find(({ id }) => id === root.value)
      : undefined;
  const pristineRoot = pristineFragment?.children[0];
  const pristineRootId =
    pristineRoot?.type === "id" ? pristineRoot.value : undefined;
  const canInheritTemplateDefaults =
    inheritTemplateDefaults ||
    (pristineFragment !== undefined &&
      root?.type === "id" &&
      pristineRootId === root.value &&
      equal(
        {
          ...fragment,
          props: fragment.props.filter(
            ({ instanceId }) => instanceId !== root.value
          ),
          // Asset records are immutable inputs. A newly selected root Asset is
          // represented by its authored reference, not by expanding children.
          assets: [],
        },
        {
          ...pristineFragment,
          props: pristineFragment.props.filter(
            ({ instanceId }) => instanceId !== root.value
          ),
          assets: [],
        }
      ));
  if (canInheritTemplateDefaults) {
    if (
      fragment.children.length !== 1 ||
      root?.type !== "id" ||
      rootInstance === undefined
    ) {
      throw new Error("Inserted template must have exactly one root instance");
    }
    const currentRootProps = fragment.props.filter(
      ({ instanceId }) => instanceId === root.value
    );
    const pristineRootProps =
      pristineFragment?.props.filter(
        ({ instanceId }) => instanceId === root.value
      ) ?? [];
    const pristineRootPropsById = new Map(
      pristineRootProps.map((prop) => [prop.id, prop])
    );
    const changedRootProps = currentRootProps.filter(
      (prop) => equal(pristineRootPropsById.get(prop.id), prop) === false
    );
    const authoredRootProps = toAuthoredProps({
      original: [],
      props: changedRootProps,
      assetReferenceValues,
    });
    const componentReference = serializeMdxComponentFallback({
      instance: rootInstance,
      props: authoredRootProps,
      instanceProps: currentRootProps,
      templateName,
    });
    const tag =
      htmlTags.find(({ instanceId }) => instanceId === root.value)?.tag ??
      rootInstance.tag;
    const props =
      componentReference?.props ??
      mapAttributeNames({
        attributes: authoredRootProps,
        direction: "instance-to-jsx",
        acceptsHtmlAttributes: tag !== undefined,
      });
    return {
      frontmatter: { properties: {} },
      children: [
        {
          type: "template",
          syntax: getMdxNamedTemplateSyntax({
            templateName,
            component: rootInstance.component,
          }),
          selfClosing: true,
          name: templateName,
          props,
          children: [],
          mdxMode: "flow",
        },
      ],
    };
  }
  const emptyDocument: MdxDocument = {
    frontmatter: { properties: {} },
    children: [],
  };
  const emptyRoot = materializeMdxAuthoredContent({
    identity,
    document: emptyDocument,
    templateMaterialization: {
      templates: [],
      diagnostics: [],
      dependencies: { templateNames: [], templates: [] },
    },
    assetReferenceValues,
  });
  const pristinePropsById = new Map(
    pristineFragment?.props.map((prop) => [prop.id, prop]) ?? []
  );
  const htmlTagByInstanceId = new Map(
    htmlTags.map(({ instanceId, tag }) => [instanceId, tag])
  );
  const serializableProps = fragment.props.filter(
    (prop) => equal(pristinePropsById.get(prop.id), prop) === false
  );
  const serializableAssetIds = new Set(
    serializableProps.flatMap((prop) =>
      prop.type === "asset" ? [prop.value] : []
    )
  );
  const serializableFragment =
    pristineFragment === undefined
      ? fragment
      : {
          ...fragment,
          instances: fragment.instances.map((instance) => {
            const tag = htmlTagByInstanceId.get(instance.id) ?? instance.tag;
            return tag === undefined ||
              hasMdxComponentAdapter(instance.component)
              ? instance
              : { ...instance, component: elementComponent, tag };
          }),
          props: serializableProps,
          assets: fragment.assets.filter(({ id }) =>
            serializableAssetIds.has(id)
          ),
          dataSources: [],
          resources: [],
          breakpoints: [],
          styleSourceSelections: [],
          styleSources: [],
          styles: [],
        };
  try {
    const authored = await preferMarkdownSyntax(
      reconcileMdxAuthoredContent({
        root: emptyRoot,
        fragment: serializableFragment,
      })
    );
    const rootNode =
      authored.children.length === 1 ? authored.children[0] : undefined;
    if (
      rootNode === undefined ||
      rootNode.type === "text" ||
      rootNode.type === "comment" ||
      rootNode.type === "opaque"
    ) {
      throw new Error("Inserted template root cannot be represented in MDX");
    }
    const rootChild = fragment.children[0];
    const rootInstance =
      rootChild?.type === "id"
        ? fragment.instances.find(({ id }) => id === rootChild.value)
        : undefined;
    const rootInstanceProps =
      rootInstance === undefined
        ? []
        : fragment.props.filter(
            ({ instanceId }) => instanceId === rootInstance.id
          );
    const componentReference =
      rootInstance === undefined
        ? undefined
        : serializeMdxComponentFallback({
            instance: rootInstance,
            props: toAuthoredProps({
              original: [],
              props: rootInstanceProps,
              assetReferenceValues,
            }),
            instanceProps: rootInstanceProps,
            templateName,
          });
    const props =
      componentReference?.props ??
      mapAttributeNames({
        attributes: rootNode.props,
        direction: "instance-to-jsx",
        acceptsHtmlAttributes:
          rootNode.type === "element" || rootInstance?.tag !== undefined,
      });
    const children = componentReference?.children ?? rootNode.children;
    return {
      ...authored,
      children: [
        {
          type: "template" as const,
          syntax: getMdxNamedTemplateSyntax({
            templateName,
            component: rootInstance?.component,
          }),
          selfClosing: componentReference?.selfClosing ?? false,
          name: templateName,
          props,
          children,
          mdxMode:
            componentReference?.mdxMode ??
            (rootNode.type === "element" && rootNode.syntax === "mdx"
              ? rootNode.mdxMode
              : rootNode.type === "template"
                ? rootNode.mdxMode
                : elementsByTag[rootNode.tag]?.children.includes("phrasing") ===
                    true
                  ? ("text" as const)
                  : ("flow" as const)),
        },
      ],
    };
  } catch (error) {
    if (pristineFragment !== undefined) {
      throw error;
    }
    const rootChild = fragment.children[0];
    const rootInstance =
      rootChild?.type === "id"
        ? fragment.instances.find(({ id }) => id === rootChild.value)
        : undefined;
    const componentFallback =
      rootInstance === undefined
        ? undefined
        : serializeMdxComponentFallback({
            instance: rootInstance,
            props: toAuthoredProps({
              original: [],
              props: fragment.props.filter(
                ({ instanceId }) => instanceId === rootInstance.id
              ),
              assetReferenceValues,
            }),
            instanceProps: fragment.props.filter(
              ({ instanceId }) => instanceId === rootInstance.id
            ),
            templateName,
          });
    if (componentFallback !== undefined) {
      return {
        frontmatter: { properties: {} },
        children: [
          {
            ...componentFallback,
            selfClosing: componentFallback.children.length === 0,
            name: templateName,
          },
        ],
      };
    }
    const props =
      rootInstance === undefined
        ? []
        : mapAttributeNames({
            attributes: toAuthoredProps({
              original: [],
              props: fragment.props.filter(
                (prop) =>
                  prop.instanceId === rootInstance.id &&
                  (prop.type === "string" ||
                    prop.type === "number" ||
                    prop.type === "boolean")
              ),
            }),
            direction: "instance-to-jsx",
            acceptsHtmlAttributes: false,
          });
    const children =
      rootInstance?.children.every((child) => child.type === "text") === true
        ? rootInstance.children.flatMap((child) =>
            child.type === "text" && child.value !== ""
              ? [{ type: "text" as const, value: child.value }]
              : []
          )
        : [];
    return {
      frontmatter: { properties: {} },
      children: [
        {
          type: "template" as const,
          syntax: getMdxNamedTemplateSyntax({
            templateName,
            component: rootInstance?.component,
          }),
          selfClosing: children.length === 0,
          name: templateName,
          props,
          children,
          mdxMode:
            children.length === 0 ? ("flow" as const) : ("text" as const),
        },
      ],
    };
  }
};

export type MdxTemplateInsertion = Readonly<{
  templateName: string;
  pristineFragment: WebstudioFragment;
  htmlTags?: readonly Readonly<{
    instanceId: Instance["id"];
    tag: string;
  }>[];
}>;

const reconcileMdxAuthoredContentWithTemplateInsertions = async ({
  root,
  fragment,
  insertedTemplates,
  insertedTemplateNames,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  fragment: WebstudioFragment;
  insertedTemplates: ReadonlyMap<Instance["id"], MdxTemplateInsertion>;
  insertedTemplateNames: ReadonlyMap<Instance["id"], string>;
}) => {
  if (insertedTemplates.size === 0 && insertedTemplateNames.size === 0) {
    return preferMarkdownSyntax(
      reconcileMdxAuthoredContent({
        root,
        fragment: omitTransientEmptyMarkdownDrafts({ root, fragment }),
      })
    );
  }
  const fragmentData = createWebstudioDataFromFragment(fragment);
  const insertions = await Promise.all(
    fragment.children.flatMap((child) => {
      if (child.type !== "id") {
        return [];
      }
      const insertion = insertedTemplates.get(child.value);
      const templateName =
        insertion?.templateName ?? insertedTemplateNames.get(child.value);
      if (templateName === undefined) {
        return [];
      }
      const insertionFragment = extractWebstudioFragment(
        fragmentData,
        child.value
      );
      return [
        serializeMdxTemplateInsertion({
          identity: root.identity,
          fragment: insertionFragment,
          templateName,
          assetReferenceValues: root.assetReferenceValues,
          inheritTemplateDefaults:
            insertion !== undefined &&
            equal(insertionFragment, insertion.pristineFragment),
          pristineFragment: insertion?.pristineFragment,
          htmlTags: insertion?.htmlTags,
        }).then((document) => ({
          rootInstanceId: child.value,
          fragment: insertionFragment,
          document,
        })),
      ];
    })
  );
  if (insertions.length === 0) {
    return preferMarkdownSyntax(
      reconcileMdxAuthoredContent({
        root,
        fragment: omitTransientEmptyMarkdownDrafts({ root, fragment }),
      })
    );
  }

  const originalKeys = getUnsupportedNamespaceKeys([root.fragment]);
  const removedInstanceIds = new Set(
    insertions.flatMap(({ fragment: insertion }) =>
      insertion.instances.map(({ id }) => id)
    )
  );
  const removedPropIds = new Set(
    insertions.flatMap(({ fragment: insertion }) =>
      insertion.props.map(({ id }) => id)
    )
  );
  const removedKeys = getUnsupportedNamespaceKeys(
    insertions.map(({ fragment }) => fragment)
  );
  const reservedInstanceIds = new Set(fragment.instances.map(({ id }) => id));
  const markerByRootId = new Map(
    insertions.map(({ rootInstanceId }, index) => {
      let markerId = `mdx-template-insertion-${index}`;
      while (reservedInstanceIds.has(markerId)) {
        markerId = `${markerId}-next`;
      }
      reservedInstanceIds.add(markerId);
      return [rootInstanceId, markerId];
    })
  );
  const markerInstances = Array.from(markerByRootId.values(), (id) => ({
    type: "instance" as const,
    id,
    component: elementComponent,
    tag: "div",
    children: [],
  }));
  const reservedPropIds = new Set(fragment.props.map(({ id }) => id));
  const markerProps = Array.from(markerByRootId.values(), (instanceId) => {
    let id = `${instanceId}-prop`;
    while (reservedPropIds.has(id)) {
      id = `${id}-next`;
    }
    reservedPropIds.add(id);
    return {
      id,
      instanceId,
      name: "data-ws-mdx-template-insertion",
      type: "string" as const,
      value: instanceId,
    };
  });
  const normalized = {
    ...fragment,
    children: fragment.children.map((child) =>
      child.type === "id" && markerByRootId.has(child.value)
        ? { type: "id" as const, value: markerByRootId.get(child.value)! }
        : child
    ),
    instances: [
      ...fragment.instances.filter(({ id }) => !removedInstanceIds.has(id)),
      ...markerInstances,
    ],
    props: [
      ...fragment.props.filter(({ id }) => !removedPropIds.has(id)),
      ...markerProps,
    ],
    ...Object.fromEntries(
      unsupportedNamespaces.map((namespace) => [
        namespace,
        fragment[namespace].filter((record) => {
          const key = getNamespaceRecordKey(namespace, record);
          return (
            removedKeys[namespace].has(key) === false ||
            originalKeys[namespace].has(key)
          );
        }),
      ])
    ),
  } as WebstudioFragment;
  const reconciled = reconcileMdxAuthoredContent({
    root,
    fragment: omitTransientEmptyMarkdownDrafts({ root, fragment: normalized }),
  });
  const insertionByMarker = new Map(
    insertions.map((insertion) => [
      markerByRootId.get(insertion.rootInstanceId),
      insertion.document.children,
    ])
  );
  return preferMarkdownSyntax({
    ...reconciled,
    children: reconciled.children.flatMap((node) => {
      if (node.type !== "element") {
        return [node];
      }
      const marker = node.props.find(
        ({ name }) => name === "data-ws-mdx-template-insertion"
      )?.value;
      return typeof marker === "string" && insertionByMarker.has(marker)
        ? insertionByMarker.get(marker)!
        : [node];
    }),
  });
};

export const rebaseMdxAuthoredContent = async ({
  root,
  fragment,
  latest,
  latestRevision,
  latestIsLocal = false,
  insertedTemplates = new Map(),
  insertedTemplateNames = new Map(),
}: {
  root: MaterializedMdxAuthoredContentRoot;
  fragment: WebstudioFragment;
  latest: MdxDocument;
  latestRevision?: string;
  latestIsLocal?: boolean;
  insertedTemplates?: ReadonlyMap<Instance["id"], MdxTemplateInsertion>;
  /** @deprecated Use insertedTemplates to preserve pristine template defaults. */
  insertedTemplateNames?: ReadonlyMap<Instance["id"], string>;
}) => {
  if (
    (latestRevision !== undefined &&
      root.identity.revision !== latestRevision) ||
    (latestIsLocal === false &&
      isMdxValueEqual(root.document, latest) === false)
  ) {
    throw new MdxAuthoredContentConflictError(
      "The MDX content source changed before the edit was saved. Reload to continue."
    );
  }
  const local = await reconcileMdxAuthoredContentWithTemplateInsertions({
    root,
    fragment,
    insertedTemplates,
    insertedTemplateNames,
  });
  return preferMarkdownSyntax(
    latestIsLocal
      ? mergeLocalMdxDocument({ base: root.document, local, latest })
      : local
  );
};
