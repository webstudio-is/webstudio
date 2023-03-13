import { nanoid } from "nanoid";
import {
  getStyleDeclKey,
  Instance,
  Instances,
  InstancesItem,
  Prop,
  Props,
  StyleDecl,
  Styles,
  StyleSource,
  StyleSources,
  StyleSourceSelection,
  StyleSourceSelections,
} from "@webstudio-is/project-build";
import { getComponentMeta } from "@webstudio-is/react-sdk";

// slots can have multiple parents so instance should be addressed
// with full rendered path to avoid double selections with slots
// and support deletion of slot child from specific parent
// selector starts with target instance and ends with root
export type InstanceSelector = Instance["id"][];

// provide a selector starting with ancestor id
// useful to select parent instance or one of breadcrumbs instances
export const getAncestorInstanceSelector = (
  instanceSelector: InstanceSelector,
  ancestorId: Instance["id"]
): undefined | InstanceSelector => {
  const ancestorIndex = instanceSelector.indexOf(ancestorId);
  if (ancestorIndex === -1) {
    return undefined;
  }
  return instanceSelector.slice(ancestorIndex);
};

// this utility is temporary solution to compute instance selectors
// before all logic is migrated to get it from rendered context
// @todo should be deleted before adding slots
export const getInstanceSelector = (
  instances: Instances,
  instanceId: Instance["id"]
) => {
  const parentInstancesById = new Map<Instance["id"], Instance["id"]>();
  for (const instance of instances.values()) {
    for (const child of instance.children) {
      if (child.type === "id") {
        parentInstancesById.set(child.value, instance.id);
      }
    }
  }
  const selector: InstanceSelector = [];
  let currentInstanceId: undefined | Instance["id"] = instanceId;
  while (currentInstanceId) {
    selector.push(currentInstanceId);
    currentInstanceId = parentInstancesById.get(currentInstanceId);
  }
  return selector;
};

export const createComponentInstance = (
  component: Instance["component"]
): InstancesItem => {
  const componentMeta = getComponentMeta(component);
  return {
    type: "instance",
    id: nanoid(),
    component,
    children:
      componentMeta?.children?.map((value) => ({ type: "text", value })) ?? [],
  };
};

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

export type InstancesIndex = {
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

export const insertInstanceMutableDeprecated = (
  instancesIndex: InstancesIndex,
  instance: Instance,
  dropTarget?: DroppableTarget
) => {
  if (dropTarget === undefined) {
    return;
  }
  const parentInstance = instancesIndex.instancesById.get(dropTarget.parentId);
  if (parentInstance === undefined) {
    return;
  }
  const { position } = dropTarget;
  if (position === "end") {
    parentInstance.children.push(instance);
  } else {
    parentInstance.children.splice(position, 0, instance);
  }
};

export const reparentInstanceMutableDeprecated = (
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

export const reparentInstanceMutable = (
  instances: Instances,
  instanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
) => {
  const [instanceId, parentInstanceId] = instanceSelector;
  const prevParent =
    parentInstanceId === undefined
      ? undefined
      : instances.get(parentInstanceId);
  const nextParent = instances.get(dropTarget.parentId);
  const instance = instances.get(instanceId);
  if (
    prevParent === undefined ||
    nextParent === undefined ||
    instance === undefined
  ) {
    return;
  }

  const prevPosition = prevParent.children.findIndex(
    (child) => child.type === "id" && child.value === instanceId
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

  const [child] = prevParent.children.splice(prevPosition, 1);
  if (nextPosition === "end") {
    nextParent.children.push(child);
  } else {
    nextParent.children.splice(nextPosition, 0, child);
  }
};

export const getInstanceAncestorsAndSelf = (
  instancesIndex: InstancesIndex,
  instanceId: Instance["id"]
) => {
  const { instancesById, parentInstancesById } = instancesIndex;
  const path = [];
  let instance = instancesById.get(instanceId);
  while (instance) {
    path.unshift(instance);
    instance = parentInstancesById.get(instance.id);
  }
  return path;
};

export const findClosestRichTextInstance = (
  instancesIndex: InstancesIndex,
  instanceId: Instance["id"]
) => {
  return getInstanceAncestorsAndSelf(instancesIndex, instanceId)
    .reverse()
    .find(
      (instance) => getComponentMeta(instance.component)?.type === "rich-text"
    );
};

export const cloneStyles = (
  styles: Styles,
  clonedStyleSourceIds: Map<Instance["id"], Instance["id"]>
) => {
  const clonedStyles: StyleDecl[] = [];
  for (const styleDecl of styles.values()) {
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

export const insertInstancesMutable = (
  instances: Instances,
  insertedInstances: InstancesItem[],
  rootIds: Instance["id"][],
  dropTarget: undefined | DroppableTarget
) => {
  if (dropTarget === undefined) {
    return;
  }
  const parentInstance = instances.get(dropTarget.parentId);
  if (parentInstance === undefined) {
    return;
  }

  let treeRootInstanceId: undefined | Instance["id"] = undefined;
  for (const instance of insertedInstances) {
    if (treeRootInstanceId === undefined) {
      treeRootInstanceId = instance.id;
    }
    instances.set(instance.id, instance);
  }
  if (treeRootInstanceId === undefined) {
    return;
  }

  const { position } = dropTarget;
  const dropTargetChildren: InstancesItem["children"] = rootIds.map(
    (instanceId) => ({
      type: "id",
      value: instanceId,
    })
  );
  if (position === "end") {
    parentInstance.children.push(...dropTargetChildren);
  } else {
    parentInstance.children.splice(position, 0, ...dropTargetChildren);
  }
};

export const insertInstancesCopyMutable = (
  instances: Instances,
  copiedInstances: InstancesItem[],
  dropTarget: undefined | DroppableTarget
) => {
  const copiedInstanceIds = new Map<Instance["id"], Instance["id"]>();
  const copiedInstancesWithNewIds: InstancesItem[] = [];
  for (const instance of copiedInstances) {
    const newInstanceId = nanoid();
    copiedInstanceIds.set(instance.id, newInstanceId);
  }

  for (const instance of copiedInstances) {
    copiedInstancesWithNewIds.push({
      ...instance,
      id: copiedInstanceIds.get(instance.id) ?? instance.id,
      children: instance.children.map((child) => {
        if (child.type === "id") {
          return {
            type: "id",
            value: copiedInstanceIds.get(child.value) ?? child.value,
          };
        }
        return child;
      }),
    });
  }

  insertInstancesMutable(
    instances,
    copiedInstancesWithNewIds,
    // consider the first instance as the root
    [copiedInstancesWithNewIds[0].id],
    dropTarget
  );

  return copiedInstanceIds;
};

export const insertStyleSourcesCopyMutable = (
  styleSources: StyleSources,
  copiedStyleSources: StyleSource[]
) => {
  // store map of old ids to new ids to copy dependant data
  const copiedStyleSourceIds = new Map<StyleSource["id"], StyleSource["id"]>();
  for (const styleSource of copiedStyleSources) {
    const newStyleSourceId = nanoid();
    copiedStyleSourceIds.set(styleSource.id, newStyleSourceId);
    styleSources.set(newStyleSourceId, {
      ...styleSource,
      id: newStyleSourceId,
    });
  }
  return copiedStyleSourceIds;
};

export const insertPropsCopyMutable = (
  props: Props,
  copiedProps: Prop[],
  copiedInstanceIds: Map<Instance["id"], Instance["id"]>
) => {
  for (const prop of copiedProps) {
    const newInstanceId =
      copiedInstanceIds.get(prop.instanceId) ?? prop.instanceId;
    const newPropId = nanoid();
    props.set(newPropId, {
      ...prop,
      id: newPropId,
      instanceId: newInstanceId,
    });
  }
};

export const insertStyleSourceSelectionsCopyMutable = (
  styleSourceSelections: StyleSourceSelections,
  copiedStyleSourceSelections: StyleSourceSelection[],
  copiedInstanceIds: Map<Instance["id"], Instance["id"]>,
  copiedStyleSourceIds: Map<StyleSource["id"], StyleSource["id"]>
) => {
  for (const styleSourceSelection of copiedStyleSourceSelections) {
    // preserve ids when no new id provided
    // for example for non-local style source
    const newInstanceId =
      copiedInstanceIds.get(styleSourceSelection.instanceId) ??
      styleSourceSelection.instanceId;
    const newValues = styleSourceSelection.values.map(
      (styleSourceId) =>
        copiedStyleSourceIds.get(styleSourceId) ?? styleSourceId
    );
    styleSourceSelections.set(newInstanceId, {
      instanceId: newInstanceId,
      values: newValues,
    });
  }
};

export const insertStylesCopyMutable = (
  styles: Styles,
  copiedStyles: StyleDecl[],
  copiedStyleSourceIds: Map<StyleSource["id"], StyleSource["id"]>
) => {
  for (const styleDecl of copiedStyles) {
    // preserve ids when no new id provided
    const newStyleSourceId =
      copiedStyleSourceIds.get(styleDecl.styleSourceId) ??
      styleDecl.styleSourceId;
    const styleDeclCopy = {
      ...styleDecl,
      styleSourceId: newStyleSourceId,
    };
    styles.set(getStyleDeclKey(styleDeclCopy), styleDeclCopy);
  }
};
