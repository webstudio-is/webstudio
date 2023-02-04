import { nanoid } from "nanoid";
import produce from "immer";
import type {
  Instance,
  Props,
  Styles,
  StyleSource,
  StyleSources,
  StyleSourceSelections,
} from "@webstudio-is/project-build";
import { getComponentMeta } from "@webstudio-is/react-sdk";

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

type InstancesIndex = {
  rootInstanceId: undefined | Instance["id"];
  instancesById: Map<Instance["id"], Instance>;
  parentInstancesById: Map<Instance["id"], Instance>;
};

export const createInstancesIndex = (
  rootInstance: undefined | Instance
): InstancesIndex => {
  const instancesById = new Map<Instance["id"], Instance>();
  const parentInstancesById = new Map<Instance["id"], Instance>();
  if (rootInstance) {
    // traverse skips root without parent
    instancesById.set(rootInstance.id, rootInstance);
    traverseInstances(rootInstance, (child, parent) => {
      parentInstancesById.set(child.id, parent);
      instancesById.set(child.id, child);
    });
  }
  return {
    rootInstanceId: rootInstance?.id,
    instancesById,
    parentInstancesById,
  };
};

const isInstanceDroppable = (instance: Instance) => {
  const meta = getComponentMeta(instance.component);
  return meta?.type === "body" || meta?.type === "container";
};

type DroppableTarget = {
  parentId: Instance["id"];
  position: number;
};

export const findClosestDroppableTarget = (
  instancesIndex: InstancesIndex,
  instanceId: undefined | Instance["id"]
): undefined | DroppableTarget => {
  const { instancesById, parentInstancesById } = instancesIndex;

  if (instancesIndex.rootInstanceId === undefined) {
    return;
  }
  // fallback to root instance
  let droppableInstance = instancesById.get(
    instanceId ?? instancesIndex.rootInstanceId
  );
  if (droppableInstance === undefined) {
    return;
  }
  let position = -1;
  while (isInstanceDroppable(droppableInstance) === false) {
    const parentInstance = parentInstancesById.get(droppableInstance.id);
    if (parentInstance === undefined) {
      break;
    }
    // source of lookup in children
    const sourceInstanceId = droppableInstance.id;
    droppableInstance = parentInstance;
    position = droppableInstance.children.findIndex(
      (child) => child.type === "instance" && child.id === sourceInstanceId
    );
  }

  return {
    parentId: droppableInstance.id,
    // put in the end when no position provided
    position:
      position === -1 ? droppableInstance.children.length : position + 1,
  };
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
    const newId = nanoid();
    clonedInstanceIds.set(targetInstance.id, newId);
    targetInstance.id = newId;
    traverseInstances(targetInstance, (instance) => {
      const newId = nanoid();
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
      id: nanoid(),
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
    const newId = nanoid();
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

export const cloneStyles = (
  styles: Styles,
  clonedStyleSourceIds: Map<Instance["id"], Instance["id"]>
) => {
  const clonedStyles: Styles = [];
  for (const styleDecl of styles) {
    const styleSourceId = clonedStyleSourceIds.get(styleDecl.styleSourceId);
    if (styleSourceId === undefined) {
      continue;
    }
    clonedStyles.push({
      ...styleDecl,
      styleSourceId,
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
