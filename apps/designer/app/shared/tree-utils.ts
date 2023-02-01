import ObjectId from "bson-objectid";
import produce from "immer";
import type {
  Instance,
  Props,
  Styles,
  StyleSource,
  StyleSources,
  StyleSourceSelections,
} from "@webstudio-is/project-build";

const traverseInstances = (
  instance: Instance,
  cb: (child: Instance, parent: Instance) => void
) => {
  for (const child of instance.children) {
    if (child.type === "text") {
      continue;
    }
    if (child.type === "instance") {
      cb(child, instance);
      traverseInstances(child, cb);
    }
  }
};

export const findSubtree = (
  rootInstance: Instance,
  targetInstanceId: Instance["id"]
) => {
  const instancesById = new Map<Instance["id"], Instance>();
  const parentInstancesById = new Map<Instance["id"], Instance>();
  const subtreeIds = new Set<Instance["id"]>();

  traverseInstances(rootInstance, (child, instance) => {
    // add target instance
    if (child.id === targetInstanceId) {
      subtreeIds.add(child.id);
      parentInstancesById.set(child.id, instance);
      instancesById.set(child.id, child);
    }
    // add all descendants of target instance
    if (subtreeIds.has(instance.id)) {
      subtreeIds.add(child.id);
    }
  });

  return {
    parentInstance: parentInstancesById.get(targetInstanceId),
    targetInstance: instancesById.get(targetInstanceId),
    subtreeIds,
  };
};

export const cloneInstance = (targetInstance: Instance) => {
  const clonedInstanceIds = new Map<Instance["id"], Instance["id"]>();
  const clonedInstance = produce((targetInstance) => {
    const newId = ObjectId().toString();
    clonedInstanceIds.set(targetInstance.id, newId);
    targetInstance.id = newId;
    traverseInstances(targetInstance, (instance) => {
      const newId = ObjectId().toString();
      clonedInstanceIds.set(instance.id, newId);
      instance.id = newId;
    });
  })(targetInstance);
  return {
    clonedInstanceIds,
    clonedInstance,
  };
};

export const cloneProps = (
  props: Props,
  clonedInstanceIds: Map<Instance["id"], Instance["id"]>
) => {
  const clonedProps: Props = [];
  for (const prop of props) {
    const instanceId = clonedInstanceIds.get(prop.instanceId);
    if (instanceId === undefined) {
      continue;
    }
    clonedProps.push({
      ...prop,
      id: ObjectId().toString(),
      instanceId,
    });
  }
  return clonedProps;
};

export const cloneStyleSources = (
  styleSources: StyleSources,
  subsetIds: Set<StyleSource["id"]>
) => {
  const clonedStyleSourceIds = new Map<Instance["id"], Instance["id"]>();
  const clonedStyleSources: StyleSources = [];
  for (const styleSource of styleSources) {
    if (subsetIds.has(styleSource.id) === false) {
      continue;
    }
    const newId = ObjectId().toString();
    clonedStyleSourceIds.set(styleSource.id, newId);
    clonedStyleSources.push({
      ...styleSource,
      id: newId,
    });
  }
  return { clonedStyleSources, clonedStyleSourceIds };
};

export const cloneStyleSourceSelections = (
  styleSourceSelections: StyleSourceSelections,
  clonedInstanceIds: Map<Instance["id"], Instance["id"]>,
  clonedStyleSourceIds: Map<Instance["id"], Instance["id"]>
) => {
  const clonedStyleSourceSelections: StyleSourceSelections = [];
  for (const styleSourceSelection of styleSourceSelections) {
    const instanceId = clonedInstanceIds.get(styleSourceSelection.instanceId);
    if (instanceId === undefined) {
      continue;
    }
    // preserve style source id when not cloned
    // which means it is non-local style source
    const values = styleSourceSelection.values.map(
      (styleSourceId) =>
        clonedStyleSourceIds.get(styleSourceId) ?? styleSourceId
    );
    clonedStyleSourceSelections.push({
      values,
      instanceId,
    });
  }
  return clonedStyleSourceSelections;
};

// @todo migrate to style source variant
export const cloneStyles = (
  styles: Styles,
  clonedInstanceIds: Map<Instance["id"], Instance["id"]>
) => {
  const clonedStyles: Styles = [];
  for (const styleDecl of styles) {
    const instanceId = clonedInstanceIds.get(styleDecl.instanceId);
    if (instanceId === undefined) {
      continue;
    }
    clonedStyles.push({
      ...styleDecl,
      instanceId,
    });
  }
  return clonedStyles;
};

export const findSubtreeLocalStyleSources = (
  subtreeIds: Set<Instance["id"]>,
  styleSources: StyleSources,
  styleSourceSelections: StyleSourceSelections
) => {
  const localStyleSourceIds = new Set<StyleSource["id"]>();
  for (const styleSource of styleSources) {
    if (styleSource.type === "local") {
      localStyleSourceIds.add(styleSource.id);
    }
  }

  const subtreeLocalStyleSourceIds = new Set<StyleSource["id"]>();
  for (const { instanceId, values } of styleSourceSelections) {
    // skip selections outside of subtree
    if (subtreeIds.has(instanceId) === false) {
      continue;
    }
    // find only local style sources on selections
    for (const styleSourceId of values) {
      if (localStyleSourceIds.has(styleSourceId)) {
        subtreeLocalStyleSourceIds.add(styleSourceId);
      }
    }
  }

  return subtreeLocalStyleSourceIds;
};
