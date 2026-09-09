import type { WsComponentMeta } from "./schema/component-meta";
import type { Instance, Instances } from "./schema/instances";
import type { Prop } from "./schema/props";
import { blockTemplateComponent, elementComponent } from "./core-metas";
import { pascalCase } from "change-case";

export const ROOT_INSTANCE_ID = ":root";

const traverseInstances = (
  instances: Instances,
  instanceId: Instance["id"],
  callback: (instance: Instance) => false | void,
  visited = new Set<Instance["id"]>()
) => {
  if (visited.has(instanceId)) {
    return;
  }
  visited.add(instanceId);
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return;
  }
  const skipTraversingChildren = callback(instance);
  if (skipTraversingChildren === false) {
    return;
  }
  for (const child of instance.children) {
    if (child.type === "id") {
      traverseInstances(instances, child.value, callback, visited);
    }
  }
};

export const findTreeInstanceIds = (
  instances: Instances,
  rootInstanceId: Instance["id"]
) => {
  const ids = new Set<Instance["id"]>([rootInstanceId]);
  traverseInstances(instances, rootInstanceId, (instance) => {
    ids.add(instance.id);
  });
  return ids;
};

export const findTreeInstanceIdsExcludingSubtrees = (
  instances: Instances,
  rootInstanceId: Instance["id"],
  excludedRootIds: Set<Instance["id"]>
) => {
  const ids = new Set<Instance["id"]>([rootInstanceId]);
  traverseInstances(instances, rootInstanceId, (instance) => {
    if (excludedRootIds.has(instance.id)) {
      ids.delete(instance.id);
      return false;
    }
    ids.add(instance.id);
  });
  return ids;
};

export const findTreeInstanceIdsExcludingSlotDescendants = (
  instances: Instances,
  rootInstanceId: Instance["id"]
) => {
  const ids = new Set<Instance["id"]>([rootInstanceId]);
  traverseInstances(instances, rootInstanceId, (instance) => {
    ids.add(instance.id);
    if (instance.component === "Slot") {
      return false;
    }
  });
  return ids;
};

export const findTreeInstanceIdsExcludingBlockTemplates = (
  instances: Instances,
  rootInstanceId: Instance["id"]
) => {
  const ids = new Set<Instance["id"]>();
  traverseInstances(instances, rootInstanceId, (instance) => {
    if (instance.component === blockTemplateComponent) {
      return false;
    }
    ids.add(instance.id);
  });
  return ids;
};

export const findChildReferenceIndex = (
  children: Instance["children"],
  instanceId: Instance["id"]
) =>
  children.findIndex(
    (child) => child.type === "id" && child.value === instanceId
  );

export const findParentInstanceReference = (
  instances: Instances,
  instanceId: Instance["id"]
) => {
  for (const instance of instances.values()) {
    const childIndex = findChildReferenceIndex(instance.children, instanceId);
    if (childIndex !== -1) {
      return { instance, childIndex };
    }
  }
};

export const parseComponentName = (componentName: string) => {
  const parts = componentName.split(":");
  let namespace: undefined | string;
  let name: string;
  if (parts.length === 1) {
    [name] = parts;
  } else {
    [namespace, name] = parts;
  }
  return [namespace, name] as const;
};

const getPreferredComponentNamespaceJsxPrefix = (namespace: string) => {
  if (namespace.includes("radix")) {
    return "Radix";
  }
  if (namespace.includes("animation")) {
    return "Animation";
  }
  return "Library";
};

const getQualifiedComponentNamespaceJsxPrefix = (namespace: string) =>
  pascalCase(namespace.replaceAll("/", "-"));

/** Returns the stable public JSX identifier for a registered component. */
export const getComponentJsxName = ({
  component,
  components,
}: {
  component: Instance["component"];
  components: Iterable<Instance["component"]>;
}) => {
  const [namespace, exportName] = parseComponentName(component);
  const matches = Array.from(components).filter(
    (candidate) => parseComponentName(candidate)[1] === exportName
  );
  if (matches.length === 1 || namespace === undefined) {
    return exportName;
  }
  const preferredPrefix = getPreferredComponentNamespaceJsxPrefix(namespace);
  const preferredPrefixMatches = matches.filter((candidate) => {
    const [candidateNamespace] = parseComponentName(candidate);
    return (
      candidateNamespace !== undefined &&
      getPreferredComponentNamespaceJsxPrefix(candidateNamespace) ===
        preferredPrefix
    );
  });
  const prefix =
    preferredPrefixMatches.length === 1
      ? preferredPrefix
      : getQualifiedComponentNamespaceJsxPrefix(namespace);
  return `${prefix}${exportName}`;
};

/** Resolves direct and collision-prefixed public JSX component identifiers. */
export const getComponentByJsxName = ({
  name,
  components,
}: {
  name: string;
  components: Iterable<Instance["component"]>;
}) => {
  const candidates = Array.from(components);
  const exact = candidates.filter(
    (component) => parseComponentName(component)[1] === name
  );
  if (exact.length === 1) {
    return exact[0];
  }
  const core = exact.filter(
    (component) => parseComponentName(component)[0] === undefined
  );
  if (core.length === 1) {
    return core[0];
  }
  const aliases = candidates.filter(
    (component) =>
      getComponentJsxName({ component, components: candidates }) === name
  );
  return aliases.length === 1 ? aliases[0] : undefined;
};

/**
 * Returns the instance name shown to users. The component or tag supplies the
 * default name; instance.label is the user-defined name created by renaming.
 */
export const getInstanceName = ({
  instance,
  metas,
  fallbackName,
}: {
  instance: Pick<Instance, "component" | "label" | "tag">;
  metas?: ReadonlyMap<Instance["component"], Pick<WsComponentMeta, "label">>;
  fallbackName?: string;
}) => {
  if (instance.label) {
    return instance.label;
  }
  if (instance.component === elementComponent && instance.tag) {
    return `<${instance.tag}>`;
  }
  return (
    metas?.get(instance.component)?.label ||
    fallbackName ||
    parseComponentName(instance.component)[1]
  );
};

const unresolvedHtmlTagIdsByIndex = new WeakMap<
  ReadonlyMap<Instance["id"], string>,
  ReadonlySet<Instance["id"]>
>();

export const getHtmlTagsFromProps = (props: ReadonlyMap<Prop["id"], Prop>) => {
  const tags = new Map<Instance["id"], string>();
  const unresolvedIds = new Set<Instance["id"]>();
  for (const prop of props.values()) {
    if (prop.name !== "tag") {
      continue;
    }
    if (tags.has(prop.instanceId) || prop.type !== "string") {
      unresolvedIds.add(prop.instanceId);
    }
    // Preserve the public index's existing behavior: it contains only static
    // string values and, for invalid duplicates, the last static value.
    if (prop.type === "string") {
      tags.set(prop.instanceId, prop.value);
    }
  }
  unresolvedHtmlTagIdsByIndex.set(tags, unresolvedIds);
  return tags;
};

const ambiguousProp = Symbol("ambiguous prop");

const findUniqueInstanceProp = ({
  props,
  instanceId,
  name,
}: {
  props: ReadonlyMap<Prop["id"], Prop> | undefined;
  instanceId: Instance["id"];
  name: string;
}): Prop | typeof ambiguousProp | undefined => {
  let result: Prop | undefined;
  for (const prop of props?.values() ?? []) {
    if (prop.instanceId !== instanceId || prop.name !== name) {
      continue;
    }
    if (result !== undefined) {
      return ambiguousProp;
    }
    result = prop;
  }
  return result;
};

export const getHtmlTagFromInstance = ({
  instance,
  metas,
  props,
  htmlTagsByInstanceId,
}: {
  instance: Instance;
  metas: ReadonlyMap<Instance["component"], WsComponentMeta>;
  props?: ReadonlyMap<Prop["id"], Prop>;
  htmlTagsByInstanceId?: ReadonlyMap<Instance["id"], string>;
}) => {
  // XmlNode's "tag" prop is an XML element name, not an HTML rendering tag.
  if (instance.component === "XmlNode") {
    return;
  }
  if (instance.tag !== undefined) {
    return instance.tag;
  }
  if (htmlTagsByInstanceId !== undefined) {
    const unresolvedIds = unresolvedHtmlTagIdsByIndex.get(htmlTagsByInstanceId);
    if (unresolvedIds?.has(instance.id)) {
      return;
    }
    if (htmlTagsByInstanceId.has(instance.id)) {
      return htmlTagsByInstanceId.get(instance.id);
    }
  } else {
    const tagProp = findUniqueInstanceProp({
      props,
      instanceId: instance.id,
      name: "tag",
    });
    if (tagProp === ambiguousProp || (tagProp && tagProp.type !== "string")) {
      return;
    }
    if (tagProp?.type === "string") {
      return tagProp.value;
    }
  }
  const meta = metas.get(instance.component);
  if (meta?.renderedTag !== undefined) {
    const tagProp = findUniqueInstanceProp({
      props,
      instanceId: instance.id,
      name: meta.renderedTag.prop,
    });
    if (tagProp === undefined) {
      return meta.renderedTag.default;
    }
    if (tagProp === ambiguousProp) {
      return;
    }
    const propMeta = meta.props?.[meta.renderedTag.prop];
    if (propMeta === undefined || tagProp.type !== propMeta.type) {
      return;
    }
    return meta.renderedTag.values[String(tagProp.value)];
  }
  const metaTag = Object.keys(meta?.presetStyle ?? {}).at(0);
  return metaTag;
};

export type IndexesWithinAncestors = Map<Instance["id"], number>;

export const getIndexesWithinAncestors = (
  metas: Map<Instance["component"], WsComponentMeta>,
  instances: Instances,
  rootIds: Instance["id"][]
) => {
  const ancestors = new Set<Instance["component"]>();
  for (const meta of metas.values()) {
    if (meta.indexWithinAncestor !== undefined) {
      ancestors.add(meta.indexWithinAncestor);
    }
  }

  const indexes: IndexesWithinAncestors = new Map();

  const traverseInstances = (
    instances: Instances,
    instanceId: Instance["id"],
    latestIndexes = new Map<
      Instance["component"],
      Map<Instance["component"], number>
    >()
  ) => {
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return;
    }
    const meta = metas.get(instance.component);

    // reset for both nested ancestors and block template
    if (ancestors.has(instance.component)) {
      latestIndexes = new Map(latestIndexes);
      latestIndexes.set(instance.component, new Map());
    }
    if (instance.component === blockTemplateComponent) {
      latestIndexes = new Map(latestIndexes);
      for (const key of latestIndexes.keys()) {
        latestIndexes.set(key, new Map());
      }
    }

    if (meta?.indexWithinAncestor !== undefined) {
      const ancestorIndexes = latestIndexes.get(meta.indexWithinAncestor);
      if (ancestorIndexes) {
        let index = ancestorIndexes.get(instance.component) ?? -1;
        index += 1;
        ancestorIndexes.set(instance.component, index);
        indexes.set(instance.id, index);
      }
    }

    for (const child of instance.children) {
      if (child.type === "id") {
        traverseInstances(instances, child.value, latestIndexes);
      }
    }
  };

  const latestIndexes = new Map();
  for (const instanceId of rootIds) {
    traverseInstances(instances, instanceId, latestIndexes);
  }

  return indexes;
};
