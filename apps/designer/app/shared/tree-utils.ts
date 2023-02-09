import { nanoid } from "nanoid";
import produce from "immer";
import type {
  Instance,
  Prop,
  Props,
  Styles,
  StyleSource,
  StyleSources,
  StyleSourceSelection,
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

export type DroppableTarget = {
  parentId: Instance["id"];
  position: number | "end";
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

export const reparentInstanceMutable = (
  instancesIndex: InstancesIndex,
  instanceId: Instance["id"],
  dropTarget: DroppableTarget
) => {
  const prevParent = instancesIndex.parentInstancesById.get(instanceId);
  const nextParent = instancesIndex.instancesById.get(dropTarget.parentId);
  const instance = instancesIndex.instancesById.get(instanceId);
  if (
    prevParent === undefined ||
    nextParent === undefined ||
    instance === undefined
  ) {
    return;
  }

  const prevPosition = prevParent.children.findIndex(
    (child) => child.type === "instance" && child.id === instanceId
  );
  if (prevPosition === -1) {
    return;
  }

  // if parent is the same, we need to adjust the position
  // to account for the removal of the instance.
  let nextPosition = dropTarget.position;
  if (
    nextPosition !== "end" &&
    prevParent.id === nextParent.id &&
    prevPosition < nextPosition
  ) {
    nextPosition -= 1;
  }

  prevParent.children.splice(prevPosition, 1);
  if (nextPosition === "end") {
    nextParent.children.push(instance);
  } else {
    nextParent.children.splice(nextPosition, 0, instance);
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
  const clonedProps: Prop[] = [];
  for (const prop of props.values()) {
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
  const clonedStyleSources: StyleSource[] = [];
  for (const styleSource of styleSources.values()) {
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
  const clonedStyleSourceSelections: StyleSourceSelection[] = [];
  for (const styleSourceSelection of styleSourceSelections.values()) {
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
  for (const styleSource of styleSources.values()) {
    if (styleSource.type === "local") {
      localStyleSourceIds.add(styleSource.id);
    }
  }

  const subtreeLocalStyleSourceIds = new Set<StyleSource["id"]>();
  for (const { instanceId, values } of styleSourceSelections.values()) {
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
