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
  type MdxTemplateMaterialization,
} from "./mdx-materialization";
import type { MaterializedContentRoot } from "./content-storage";

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

type TemplateProvenance = Readonly<{
  type: "template";
  path: readonly number[];
  instanceId: Instance["id"];
  editablePropNames: readonly string[];
  expandedInstanceIds: readonly Instance["id"][];
  namespaceKeys: readonly Readonly<{
    namespace: UnsupportedNamespace;
    key: string;
  }>[];
}>;

type UnsupportedNamespace = (typeof unsupportedNamespaces)[number];

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

export type MdxAuthoredContentProvenance = Readonly<{
  nodes: readonly (AuthoredElementProvenance | TemplateProvenance)[];
}>;

export type MaterializedMdxAuthoredContentRoot = MaterializedContentRoot &
  Readonly<{
    document: MdxDocument;
    provenance: MdxAuthoredContentProvenance;
  }>;

const emptyFragment = (): WebstudioFragment => ({
  children: [],
  instances: [],
  props: [],
  assets: [],
  dataSources: [],
  resources: [],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
});

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
}: {
  id: string;
  instanceId: string;
  prop: MdxAuthoredProp;
  assetId?: string;
}): Prop =>
  assetId !== undefined
    ? {
        id,
        instanceId,
        name: prop.name,
        type: "asset",
        value: assetId,
      }
    : prop.value === true
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
}: {
  identity: ContentBlockExternalContentIdentity;
  document: MdxDocument;
  templateMaterialization: MdxTemplateMaterialization;
  assetReferences?: readonly AssetValueReference[];
}): MaterializedMdxAuthoredContentRoot => {
  const fragment = emptyFragment();
  const nodes: (AuthoredElementProvenance | TemplateProvenance)[] = [];
  const templatesByPath = new Map(
    templateMaterialization.templates.map((template) => [
      pathKey(template.reference.path),
      template,
    ])
  );
  const ignoredPropsByTemplateName = new Map<string, Set<string>>();
  const assetReferenceByPath = new Map(
    assetReferences.map((reference) => [
      reference.path.map(String).join("/"),
      reference,
    ])
  );
  for (const diagnostic of templateMaterialization.diagnostics) {
    if (diagnostic.code === "ignored-template-prop") {
      const props =
        ignoredPropsByTemplateName.get(diagnostic.templateName) ?? new Set();
      props.add(diagnostic.propName);
      ignoredPropsByTemplateName.set(diagnostic.templateName, props);
    }
  }

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
      if (node.type === "template") {
        const template = templatesByPath.get(pathKey(path));
        if (template === undefined || template.type === "unresolved-template") {
          continue;
        }
        const rootId = getSingleTemplateRootId(template);
        mergeTemplateFragment(fragment, template.fragment);
        const rootPropNames = new Set(
          template.fragment.props
            .filter(({ instanceId }) => instanceId === rootId)
            .map(({ name }) => name)
        );
        const ignored =
          ignoredPropsByTemplateName.get(node.name) ?? new Set<string>();
        nodes.push({
          type: "template",
          path,
          instanceId: rootId,
          editablePropNames: node.props
            .map(({ name }) => name)
            .filter((name) => rootPropNames.has(name) && !ignored.has(name)),
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
  return { identity, fragment, document, provenance: { nodes } };
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
    if (prop.type === "string") {
      values.set(prop.name, prop.value);
    } else if (prop.type === "boolean" && prop.value === true) {
      values.set(prop.name, true);
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
      if (node.type !== "text" && node.type !== "comment") {
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
        node.editablePropNames.includes(prop.name)
      ) {
        editableTemplatePropIds.add(prop.id);
      }
    }
  }
  for (const original of root.fragment.instances) {
    const template = templateByExpandedInstanceId.get(original.id);
    if (
      templateInternalIds.has(original.id) &&
      (template?.type !== "template" ||
        deletedTemplateRootIds.has(template.instanceId) === false)
    ) {
      const next = instanceById.get(original.id);
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
      template.editablePropNames.includes(prop.name) === false &&
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
        ({ name }) => provenance.editablePropNames.includes(name)
      );
      if (
        new Set(editableProps.map(({ name }) => name)).size !==
        editableProps.length
      ) {
        throw new Error("Duplicate authored template props are not supported");
      }
      const editableNames = new Set(provenance.editablePropNames);
      const nextEditable = toAuthoredProps({
        original: original.props.filter(({ name }) => editableNames.has(name)),
        props: editableProps,
      });
      const nextByName = new Map(nextEditable.map((prop) => [prop.name, prop]));
      const props = original.props.flatMap((prop) => {
        if (editableNames.has(prop.name) === false) {
          return [prop];
        }
        const next = nextByName.get(prop.name);
        nextByName.delete(prop.name);
        return next === undefined ? [] : [next];
      });
      props.push(...nextByName.values());
      return mode === "text"
        ? { ...original, props, mdxMode: "text" }
        : { ...original, props };
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
