import { nanoid } from "nanoid";
import {
  Instance,
  Instances,
  Prop,
  Props,
  StyleDecl,
  Styles,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import { findTreeInstanceIds } from "@webstudio-is/sdk";
import {
  collectionComponent,
  type WsComponentMeta,
} from "@webstudio-is/react-sdk";

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

export type DroppableTarget = {
  parentSelector: InstanceSelector;
  position: number | "end";
};

export const getInstanceOrCreateFragmentIfNecessary = (
  instances: Instances,
  dropTarget: DroppableTarget
) => {
  const [parentId] = dropTarget.parentSelector;
  const instance = instances.get(parentId);
  if (instance === undefined) {
    return;
  }
  // slot should accept only single child
  // otherwise multiple slots will have to maintain own children
  // here all slot children are wrapped with fragment instance
  if (instance.component === "Slot") {
    if (instance.children.length === 0) {
      const id = nanoid();
      const fragment: Instance = {
        type: "instance",
        id,
        component: "Fragment",
        children: [],
      };
      instances.set(id, fragment);
      instance.children.push({ type: "id", value: id });
      return {
        parentSelector: [fragment.id, ...dropTarget.parentSelector],
        position: dropTarget.position,
      };
    }
    // first slot child is always fragment
    if (instance.children[0].type === "id") {
      const fragmentId = instance.children[0].value;
      return {
        parentSelector: [fragmentId, ...dropTarget.parentSelector],
        position: dropTarget.position,
      };
    }
  }
  return;
};

/**
 * Navigator tree and canvas dnd do not have text representation
 * and position does not consider it and include only instances.
 * This function adjust the position to consider text children
 */
const adjustChildrenPosition = (
  children: Instance["children"],
  position: number
) => {
  let newPosition = 0;
  let idPosition = 0;
  for (let index = 0; index < children.length; index += 1) {
    newPosition = index;
    if (idPosition === position) {
      return newPosition;
    }
    const child = children[index];
    if (child.type === "id") {
      idPosition += 1;
    }
  }
  // the index after last item
  return newPosition + 1;
};

/**
 * Wrap children before and after drop target with spans
 * to preserve lexical specific components while allowing
 * to insert into editable components
 */
export const wrapEditableChildrenAroundDropTargetMutable = (
  instances: Instances,
  props: Props,
  metas: Map<string, WsComponentMeta>,
  dropTarget: DroppableTarget
) => {
  const [parentId] = dropTarget.parentSelector;
  const parentInstance = instances.get(parentId);
  if (parentInstance === undefined || parentInstance.children.length === 0) {
    return;
  }
  // wrap only containers with text and rich text childre
  for (const child of parentInstance.children) {
    if (child.type === "id") {
      const childInstance = instances.get(child.value);
      if (childInstance === undefined) {
        return;
      }
      const childMeta = metas.get(childInstance.component);
      if (childMeta?.type !== "rich-text-child") {
        return;
      }
    }
  }
  const position =
    dropTarget.position === "end"
      ? parentInstance.children.length
      : adjustChildrenPosition(parentInstance.children, dropTarget.position);

  const newChildren: Instance["children"] = [];
  let newPosition = 0;
  // create left span when not at the beginning
  if (position !== 0) {
    const leftSpan: Instance = {
      id: nanoid(),
      type: "instance",
      component: "Text",
      children: parentInstance.children.slice(0, position),
    };
    newChildren.push({ type: "id", value: leftSpan.id });
    instances.set(leftSpan.id, leftSpan);
    const tagProp: Prop = {
      id: nanoid(),
      instanceId: leftSpan.id,
      type: "string",
      name: "tag",
      value: "span",
    };
    props.set(tagProp.id, tagProp);
    newPosition = 1;
  }
  // create right span when not in the end
  if (position < parentInstance.children.length) {
    const rightSpan: Instance = {
      id: nanoid(),
      type: "instance",
      component: "Text",
      children: parentInstance.children.slice(position),
    };
    newChildren.push({ type: "id", value: rightSpan.id });
    instances.set(rightSpan.id, rightSpan);
    const tagProp: Prop = {
      id: nanoid(),
      instanceId: rightSpan.id,
      type: "string",
      name: "tag",
      value: "span",
    };
    props.set(tagProp.id, tagProp);
  }
  parentInstance.children = newChildren;
  return {
    parentSelector: dropTarget.parentSelector,
    position: newPosition,
  };
};

export const getReparentDropTargetMutable = (
  instances: Instances,
  props: Props,
  metas: Map<string, WsComponentMeta>,
  instanceSelector: InstanceSelector,
  dropTarget: DroppableTarget
): undefined | DroppableTarget => {
  const [instanceId, parentInstanceId, grandparentInstanceId] =
    instanceSelector;
  const grandparentInstance =
    grandparentInstanceId === undefined
      ? undefined
      : instances.get(grandparentInstanceId);

  let prevParent =
    parentInstanceId === undefined
      ? undefined
      : instances.get(parentInstanceId);
  // skip parent fake "item" instance and use grandparent collection as parent
  if (grandparentInstance?.component === collectionComponent) {
    prevParent = grandparentInstance;
  }

  dropTarget =
    getInstanceOrCreateFragmentIfNecessary(instances, dropTarget) ?? dropTarget;
  dropTarget =
    wrapEditableChildrenAroundDropTargetMutable(
      instances,
      props,
      metas,
      dropTarget
    ) ?? dropTarget;
  const [parentId] = dropTarget.parentSelector;
  const nextParent = instances.get(parentId);

  // delect is target is one of own descendants
  // prevent reparenting to avoid infinite loop
  const instanceDescendants = findTreeInstanceIds(instances, instanceId);
  for (const instanceId of instanceDescendants) {
    if (dropTarget.parentSelector.includes(instanceId)) {
      return;
    }
  }

  if (prevParent === undefined || nextParent === undefined) {
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

  return {
    parentSelector: dropTarget.parentSelector,
    position: nextPosition,
  };
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

export const findLocalStyleSourcesWithinInstances = (
  styleSources: IterableIterator<StyleSource> | StyleSource[],
  styleSourceSelections:
    | IterableIterator<StyleSourceSelection>
    | StyleSourceSelection[],
  instanceIds: Set<Instance["id"]>
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
    if (instanceIds.has(instanceId) === false) {
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
