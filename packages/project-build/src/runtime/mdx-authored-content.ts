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
  mapAttributeNames,
} from "@webstudio-is/content-engine/jsx-attributes";
import {
  elementComponent,
  getStyleDeclKey,
  type ContentBlockExternalContentIdentity,
  type Instance,
  type Prop,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import {
  createMdxScopeIdGenerator,
  type MaterializedMdxTemplate,
  type MdxJsxPropContext,
  type MdxTemplateMaterialization,
} from "./mdx-materialization";
import { createEmptyWebstudioFragment } from "./component-template";
import {
  createWebstudioDataFromFragment,
  extractWebstudioFragment,
} from "./fragment";
import {
  materializeMdxComponent,
  serializeMdxComponent,
  serializeMdxComponentFallback,
} from "./mdx-component-adapters";
import {
  parseMdxStaticProp,
  serializeMdxStaticProp,
  type MdxStaticPropType,
} from "./mdx-static-props";
import { getHtmlAttributeType } from "./html-attribute-utils";

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
}>;

type TemplateProvenance = Readonly<{
  type: "template";
  path: readonly number[];
  instanceId: Instance["id"];
  editableTextChildren: boolean;
  editablePropNames: readonly string[];
  jsxPropContext: MdxJsxPropContext;
  propNameMappings: readonly Readonly<{
    jsxPropName: string;
    instancePropName: string;
  }>[];
  preservedJsxPropNames?: readonly string[];
  ignoredJsxPropNames: readonly string[];
  expandedInstanceIds: readonly Instance["id"][];
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
  provenance: MdxAuthoredContentProvenance;
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
    const keys = new Set([
      ...Object.keys(leftRecord),
      ...Object.keys(rightRecord),
    ]);
    keys.delete("sourceRange");
    return Array.from(keys).every(
      (key) =>
        key in leftRecord &&
        key in rightRecord &&
        isMdxValueEqual(leftRecord[key], rightRecord[key])
    );
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
    "mdxMode",
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
    return `${node.type}:${node.name}`;
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

export const materializeMdxAuthoredContent = ({
  identity,
  document,
  templateMaterialization,
  assetReferences = [],
  createUnresolvedTemplateInstance,
}: {
  identity: ContentBlockExternalContentIdentity;
  document: MdxDocument;
  templateMaterialization: MdxTemplateMaterialization;
  assetReferences?: readonly AssetValueReference[];
  createUnresolvedTemplateInstance?: (input: {
    markerId: string;
    templateName: string;
  }) => Instance;
}): MaterializedMdxAuthoredContentRoot => {
  const fragment = createEmptyWebstudioFragment();
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
      if (node.type === "template") {
        const template = templatesByPath.get(pathKey(path));
        if (template === undefined) {
          continue;
        }
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
        mergeTemplateFragment(fragment, template.fragment);
        const rootInstance = fragment.instances.find(({ id }) => id === rootId);
        if (rootInstance === undefined) {
          throw new Error("Resolved MDX template root is missing");
        }
        const editableTextChildren = rootInstance.children.every(
          (child) => child.type === "text"
        );
        if (
          editableTextChildren &&
          node.children.length > 0 &&
          node.children.every(
            (child) => child.type === "text" || child.type === "comment"
          )
        ) {
          rootInstance.children = visit(node.children, path);
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
        nodes.push({
          type: "template",
          path,
          instanceId: rootId,
          editableTextChildren,
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
          expandedInstanceIds: template.fragment.instances.map(({ id }) => id),
          namespaceKeys: unsupportedNamespaces.flatMap((namespace) =>
            template.fragment[namespace].map((record) => ({
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
        fragment.instances.push({
          type: "instance",
          id: instanceId,
          component: materializedComponent.component,
          children: materializedComponent.children,
        });
        for (const prop of materializedComponent.props) {
          fragment.props.push(
            createLiteralProp({ id: createId(), instanceId, prop })
          );
        }
        nodes.push({ type: "component", path, instanceId });
        children.push({ type: "id", value: instanceId });
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
          ["children", ...path.flatMap((segment) => [segment, "children"])]
            .slice(0, -1)
            .concat("props", propIndex, "value")
            .map(String)
            .join("/")
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
              assetProps: node.assetProps.map((assetProp) => {
                const propId = propIds.get(assetProp.propId);
                if (propId === undefined) {
                  throw new Error(
                    `Live MDX fragment is missing prop "${assetProp.propId}"`
                  );
                }
                return { ...assetProp, propId };
              }),
            }
          : node.type === "template"
            ? {
                ...node,
                instanceId: mapInstanceId(node.instanceId),
                expandedInstanceIds:
                  node.expandedInstanceIds.map(mapInstanceId),
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
}: {
  original: readonly MdxAuthoredProp[];
  props: readonly Prop[];
  assetProps?: AuthoredElementProvenance["assetProps"];
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
  const propsByInstanceId = new Map<string, Prop[]>();
  for (const prop of fragment.props) {
    const props = propsByInstanceId.get(prop.instanceId) ?? [];
    props.push(prop);
    propsByInstanceId.set(prop.instanceId, props);
  }
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

  const templateByExpandedInstanceId = new Map(
    root.provenance.nodes.flatMap((node) =>
      node.type === "template"
        ? node.expandedInstanceIds.map((id) => [id, node] as const)
        : []
    )
  );
  const templateInternalIds = new Set(templateByExpandedInstanceId.keys());
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
    if (
      templateInternalIds.has(original.id) &&
      (template?.type !== "template" ||
        deletedTemplateRootIds.has(template.instanceId) === false) &&
      isEditableTemplateText === false
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
    if (
      original !== undefined &&
      templateInternalIds.has(original.instanceId) &&
      !editableTemplatePropIds.has(prop.id) &&
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
      (original === undefined || !equal(original, prop))
    ) {
      throw new Error(
        "Expanded template props cannot be represented losslessly in MDX"
      );
    }
  }
  for (const original of root.fragment.props) {
    if (
      templateInternalIds.has(original.instanceId) &&
      deletedTemplateRootIds.has(
        templateByExpandedInstanceId.get(original.instanceId)?.instanceId ?? ""
      ) === false &&
      !editableTemplatePropIds.has(original.id) &&
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
      for (const expandedId of provenance.expandedInstanceIds) {
        serializedInstanceIds.add(expandedId);
      }
      const original = originalNodeByPath.get(pathKey(provenance.path));
      if (original?.type !== "template") {
        throw new Error("Authored MDX template provenance is invalid");
      }
      const editableProps = (propsByInstanceId.get(instanceId) ?? []).filter(
        (prop) => isEditableTemplateProp({ provenance, prop })
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
      const instancePropNameByJsxName = new Map(
        provenance.propNameMappings.map((mapping) => [
          mapping.jsxPropName,
          mapping.instancePropName,
        ])
      );
      const toInstancePropName = (jsxPropName: string) =>
        instancePropNameByJsxName.get(jsxPropName) ?? jsxPropName;
      const ignoredJsxPropNames = new Set(provenance.ignoredJsxPropNames);
      const componentPropNames = new Set(
        provenance.jsxPropContext.componentPropNames
      );
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
      });
      const nextByName = new Map(nextEditable.map((prop) => [prop.name, prop]));
      const props = original.props.flatMap((prop) => {
        if (ignoredJsxPropNames.has(prop.name)) {
          return [prop];
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
      assertUniqueAttributeNames(props);
      let children = original.children;
      const originalInstance = originalInstanceById.get(instanceId);
      if (
        provenance.editableTextChildren &&
        originalInstance !== undefined &&
        (original.children.length > 0 ||
          equal(instance.children, originalInstance.children) === false)
      ) {
        children = reconcileChildren({
          original: original.children,
          children: instance.children,
          mode: original.mdxMode,
          active,
        });
        if (children.length === 0) {
          throw new Error(
            "Empty template text cannot be represented losslessly in MDX"
          );
        }
      }
      if (
        props.every(
          ({ name }) =>
            ignoredJsxPropNames.has(name) === false &&
            editableNames.has(toInstancePropName(name))
        )
      ) {
        const componentNode = serializeMdxComponent({
          instance,
          props: editableProps,
          original,
        });
        if (componentNode !== undefined) {
          return componentNode;
        }
      }
      return mode === "text" ||
        (provenance.editableTextChildren && children.length > 0)
        ? { ...original, props, children, mdxMode: "text" }
        : { ...original, props, children };
    }
    const componentNode = serializeMdxComponent({
      instance,
      props: propsByInstanceId.get(instanceId) ?? [],
      original:
        provenance?.type === "component"
          ? originalNodeByPath.get(pathKey(provenance.path))
          : undefined,
    });
    const serializedComponent =
      componentNode ??
      (provenance?.type === "component"
        ? serializeMdxComponentFallback({
            instance,
            props: propsByInstanceId.get(instanceId) ?? [],
          })
        : undefined);
    if (serializedComponent !== undefined) {
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
      return serializedComponent;
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
      return {
        key:
          provenance === undefined
            ? undefined
            : `node:${pathKey(provenance.path)}`,
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
      const key =
        node.type === "text"
          ? `text:${index}`
          : provenance === undefined
            ? undefined
            : `node:${pathKey(provenance.path)}`;
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

/**
 * Markdown has no syntax for an empty paragraph. Keep newly inserted empty
 * paragraphs in memory as editing drafts until they contain authored content.
 */
export const omitTransientEmptyParagraphs = ({
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
  const omittedIds = new Set(
    fragment.instances.flatMap((instance) =>
      instance.component === elementComponent &&
      instance.tag === "p" &&
      instance.children.length === 0 &&
      referenceCountByInstanceId.get(instance.id) === 1 &&
      authoredInstanceIds.has(instance.id) === false &&
      instanceIdsWithProps.has(instance.id) === false &&
      instanceIdsWithStyleSources.has(instance.id) === false
        ? [instance.id]
        : []
    )
  );
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
        fragment: omitTransientEmptyParagraphs({ root, fragment }),
      })
    )
  );

export const serializeMdxTemplateInsertion = async ({
  identity,
  fragment,
  templateName,
}: {
  identity: ContentBlockExternalContentIdentity;
  fragment: WebstudioFragment;
  templateName: string;
}) => {
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
  });
  try {
    return preferMarkdownSyntax(
      reconcileMdxAuthoredContent({ root: emptyRoot, fragment })
    );
  } catch {
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
            props: fragment.props.filter(
              ({ instanceId }) => instanceId === rootInstance.id
            ),
            templateName,
          });
    if (componentFallback !== undefined) {
      return {
        frontmatter: { properties: {} },
        children: [componentFallback],
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

const reconcileMdxAuthoredContentWithTemplateInsertions = async ({
  root,
  fragment,
  insertedTemplateNames,
}: {
  root: MaterializedMdxAuthoredContentRoot;
  fragment: WebstudioFragment;
  insertedTemplateNames: ReadonlyMap<string, string>;
}) => {
  if (insertedTemplateNames.size === 0) {
    return preferMarkdownSyntax(
      reconcileMdxAuthoredContent({ root, fragment })
    );
  }
  const fragmentData = createWebstudioDataFromFragment(fragment);
  const insertions = await Promise.all(
    fragment.children.flatMap((child) => {
      if (child.type !== "id") {
        return [];
      }
      const templateName = insertedTemplateNames.get(child.value);
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
      reconcileMdxAuthoredContent({ root, fragment })
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
    fragment: normalized,
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
  insertedTemplateNames = new Map(),
}: {
  root: MaterializedMdxAuthoredContentRoot;
  fragment: WebstudioFragment;
  latest: MdxDocument;
  latestRevision?: string;
  latestIsLocal?: boolean;
  insertedTemplateNames?: ReadonlyMap<string, string>;
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
    fragment: omitTransientEmptyParagraphs({ root, fragment }),
    insertedTemplateNames,
  });
  return preferMarkdownSyntax(
    latestIsLocal
      ? mergeLocalMdxDocument({ base: root.document, local, latest })
      : local
  );
};
