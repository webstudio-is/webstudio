import type { WsComponentMeta } from "./schema/component-meta";
import type { Instance, Instances } from "./schema/instances";
import type { Props } from "./schema/props";
import { blockTemplateComponent, elementComponent } from "./core-metas";

export const ROOT_INSTANCE_ID = ":root";

const traverseInstances = (
  instances: Instances,
  instanceId: Instance["id"],
  callback: (instance: Instance) => false | void
) => {
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
      traverseInstances(instances, child.value, callback);
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

/**
 * Returns the instance name shown to users. The component or tag supplies the
 * default name; `instance.label` is the user-defined override created by
 * renaming the instance.
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

export const getHtmlTagsFromProps = (props: Props) => {
  const tags = new Map<Instance["id"], string>();
  for (const prop of props.values()) {
    if (prop.type === "string" && prop.name === "tag") {
      tags.set(prop.instanceId, prop.value);
    }
  }
  return tags;
};

export const getHtmlTagFromInstance = ({
  instance,
  metas,
  props,
  htmlTagsByInstanceId,
}: {
  instance: Instance;
  metas: Map<Instance["component"], WsComponentMeta>;
  props?: Props;
  htmlTagsByInstanceId?: Map<Instance["id"], string>;
}) => {
  // XmlNode's "tag" prop is an XML element name, not an HTML rendering tag.
  if (instance.component === "XmlNode") {
    return;
  }
  if (instance.tag !== undefined) {
    return instance.tag;
  }
  const propTag =
    htmlTagsByInstanceId === undefined
      ? props === undefined
        ? undefined
        : getHtmlTagsFromProps(props).get(instance.id)
      : htmlTagsByInstanceId.get(instance.id);
  if (propTag !== undefined) {
    return propTag;
  }
  const meta = metas.get(instance.component);
  const metaTag = Object.keys(meta?.presetStyle ?? {}).at(0);
  return metaTag;
};

export type IndexesWithinAncestors = Map<Instance["id"], number>;

export type GetInstanceChildren = (
  instance: Instance,
  instanceSelector: Instance["id"][]
) => Instance["children"];

export const getIndexesWithinAncestors = (
  metas: Map<Instance["component"], WsComponentMeta>,
  instances: Instances,
  rootIds: Instance["id"][],
  getInstanceChildren: GetInstanceChildren = (instance) => instance.children
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
    instanceSelector: Instance["id"][],
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

    for (const child of getInstanceChildren(instance, instanceSelector)) {
      if (child.type === "id") {
        traverseInstances(
          instances,
          child.value,
          [child.value, ...instanceSelector],
          latestIndexes
        );
      }
    }
  };

  const latestIndexes = new Map();
  for (const instanceId of rootIds) {
    traverseInstances(instances, instanceId, [instanceId], latestIndexes);
  }

  return indexes;
};
