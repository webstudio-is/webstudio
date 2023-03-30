import { nanoid } from "nanoid";
import {
  findTreeInstanceIdsExcludingSlotDescendants,
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

export const areInstanceSelectorsEqual = (
  left?: InstanceSelector,
  right?: InstanceSelector
) => {
  if (left === undefined || right === undefined) {
    return false;
  }
  return left.join(",") === right.join(",");
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

const isInstanceDroppable = (instance: InstancesItem) => {
  const meta = getComponentMeta(instance.component);
  return meta?.type === "container";
};

export type DroppableTarget = {
  parentSelector: InstanceSelector;
  position: number | "end";
};

export const findClosestDroppableTarget = (
  instances: Instances,
  instanceSelector: InstanceSelector
): DroppableTarget => {
  // fallback to root as drop target when selector is stale
  const rootDropTarget: DroppableTarget = {
    parentSelector: [instanceSelector[instanceSelector.length - 1]],
    position: "end",
  };
  let position = -1;
  let lastChild: undefined | InstancesItem = undefined;
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    if (instance === undefined) {
      return rootDropTarget;
    }
    // find the index of child from selector
    if (lastChild) {
      const lastChildId = lastChild.id;
      position = instance.children.findIndex(
        (child) => child.type === "id" && child.value === lastChildId
      );
    }
    lastChild = instance;
    if (isInstanceDroppable(instance)) {
      const parentSelector = getAncestorInstanceSelector(
        instanceSelector,
        instance.id
      );
      if (parentSelector === undefined) {
        return rootDropTarget;
      }
      return {
        parentSelector: parentSelector,
        position: position === -1 ? "end" : position + 1,
      };
    }
  }
  return rootDropTarget;
};

const getInstanceOrCreateFragmentIfNecessary = (
  instances: Instances,
  instanceId: Instance["id"]
) => {
  const instance = instances.get(instanceId);
  if (instance === undefined) {
    return;
  }
  // slot should accept only single child
  // otherwise multiple slots will have to maintain own children
  // here all slot children are wrapped with fragment instance
  if (instance.component === "Slot") {
    if (instance.children.length === 0) {
      const id = nanoid();
      const fragment: InstancesItem = {
        type: "instance",
        id,
        component: "Fragment",
        children: [],
      };
      instances.set(id, fragment);
      instance.children.push({ type: "id", value: id });
      return fragment;
    }
    // first slot child is always fragment
    if (instance.children[0].type === "id") {
      return instances.get(instance.children[0].value);
    }
  }
  return instance;
};

const getSlotFragmentSelector = (
  instances: Instances,
  instanceSelector: InstanceSelector
) => {
  const instance = instances.get(instanceSelector[0]);
  if (
    instance?.component !== "Slot" ||
    instance.children.length === 0 ||
    instance.children[0].type !== "id"
  ) {
    return;
  }
  // first slot child is always fragment
  return [instance.children[0].value, ...instanceSelector];
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
  const nextParent = getInstanceOrCreateFragmentIfNecessary(
    instances,
    dropTarget.parentSelector[0]
  );
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
  dropTarget: DroppableTarget
) => {
  const parentInstance = getInstanceOrCreateFragmentIfNecessary(
    instances,
    dropTarget.parentSelector[0]
  );
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
  dropTarget: DroppableTarget
) => {
  const newInstances: Instances = new Map();
  for (const instance of copiedInstances) {
    newInstances.set(instance.id, instance);
  }
  const newInstanceIds = findTreeInstanceIdsExcludingSlotDescendants(
    newInstances,
    copiedInstances[0].id
  );

  const copiedInstanceIds = new Map<Instance["id"], Instance["id"]>();
  const copiedInstancesWithNewIds: InstancesItem[] = [];
  for (const instanceId of newInstanceIds) {
    const newInstanceId = nanoid();
    copiedInstanceIds.set(instanceId, newInstanceId);
  }

  const preservedChildIds = new Set<Instance["id"]>();

  for (const instance of copiedInstances) {
    const newInstanceId = copiedInstanceIds.get(instance.id);
    if (newInstanceId === undefined) {
      if (instances.has(instance.id) === false) {
        instances.set(instance.id, instance);
      }
      continue;
    }

    copiedInstancesWithNewIds.push({
      ...instance,
      id: newInstanceId,
      children: instance.children.map((child) => {
        if (child.type === "id") {
          if (newInstanceIds.has(child.value) === false) {
            preservedChildIds.add(child.value);
          }
          return {
            type: "id",
            value: copiedInstanceIds.get(child.value) ?? child.value,
          };
        }
        return child;
      }),
    });
  }

  // slot descendants ids are preserved
  // so need to prevent pasting slot inside itself
  // to avoid circular tree
  const dropTargetSelector =
    // consider slot fragment when check for cycles to avoid cases like pasting slot directly into slot
    getSlotFragmentSelector(instances, dropTarget.parentSelector) ??
    dropTarget.parentSelector;
  for (const instanceId of dropTargetSelector) {
    if (preservedChildIds.has(instanceId)) {
      return new Map();
    }
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
  copiedStyleSources: StyleSource[],
  newStyleSourceIds: Set<StyleSource["id"]>
) => {
  // store map of old ids to new ids to copy dependant data
  const copiedStyleSourceIds = new Map<StyleSource["id"], StyleSource["id"]>();
  for (const styleSource of copiedStyleSources) {
    // insert without changes when style source is shared
    if (newStyleSourceIds.has(styleSource.id) === false) {
      // prevent overriding shared style sources if already exist
      if (styleSources.has(styleSource.id) === false) {
        styleSources.set(styleSource.id, styleSource);
      }
      continue;
    }

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
    const newInstanceId = copiedInstanceIds.get(prop.instanceId);
    // insert without changes when instance does not have new id
    if (newInstanceId === undefined) {
      // prevent overriding shared props if already exist
      if (props.has(prop.id) === false) {
        props.set(prop.id, prop);
      }
      continue;
    }

    // copy prop before inserting
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
    // insert without changes when style source selection does not have new instance id
    const { instanceId } = styleSourceSelection;
    const newInstanceId = copiedInstanceIds.get(instanceId);
    if (newInstanceId === undefined) {
      // prevent overriding shared style source selections if already exist
      if (styleSourceSelections.has(instanceId) === false) {
        styleSourceSelections.set(instanceId, styleSourceSelection);
      }
      continue;
    }

    const newValues = styleSourceSelection.values.map(
      (styleSourceId) =>
        // preserve shared style source ids
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
    const newStyleSourceId = copiedStyleSourceIds.get(styleDecl.styleSourceId);
    // insert without changes when style source does not have new id
    if (newStyleSourceId === undefined) {
      const styleDeclKey = getStyleDeclKey(styleDecl);
      // prevent overriding shared styles if already exist
      if (styles.has(styleDeclKey) === false) {
        styles.set(styleDeclKey, styleDecl);
      }
      continue;
    }

    const styleDeclCopy = {
      ...styleDecl,
      styleSourceId: newStyleSourceId,
    };
    styles.set(getStyleDeclKey(styleDeclCopy), styleDeclCopy);
  }
};
