// Tree utilities own generic instance-tree mechanics that are not tied to a
// specific command: selector comparison, ancestry checks, drop target shaping,
// and rich-text drop target normalization.
import { nanoid } from "nanoid";
import { shallowEqual } from "shallow-equal";
import type {
  Instance,
  Instances,
  Props,
  WsComponentMeta,
} from "@webstudio-is/sdk";
import { collectionComponent, elementComponent } from "@webstudio-is/sdk";
import { isRichTextTree } from "../content-model";
import { getSlotFragmentDropTargetMutable } from "./slot";

// slots can have multiple parents so instance should be addressed
// with full rendered path to avoid double selections with slots
// and support deletion of slot child from specific parent
// selector starts with target instance and ends with root
export type InstanceSelector = Instance["id"][];

export const areInstanceSelectorsEqual = (
  left?: InstanceSelector,
  right?: InstanceSelector
) => {
  return (
    left !== undefined &&
    right !== undefined &&
    left.length === right.length &&
    left.every((instanceId, index) => instanceId === right[index])
  );
};

export const isDescendantOrSelf = (
  descendant: InstanceSelector,
  self: InstanceSelector
) => {
  if (self.length === 0) {
    return true;
  }

  if (descendant.length < self.length) {
    return false;
  }

  const endSlice = descendant.slice(-self.length);

  return shallowEqual(endSlice, self);
};

export type DroppableTarget = {
  parentSelector: InstanceSelector;
  position: number | "end";
};

const getCollectionDropTarget = (
  instances: Instances,
  dropTarget: DroppableTarget
) => {
  const [parentId, grandparentId] = dropTarget.parentSelector;
  const parent = instances.get(parentId);
  const grandparent = instances.get(grandparentId);
  if (parent === undefined && grandparent?.component === collectionComponent) {
    return {
      parentSelector: dropTarget.parentSelector.slice(1),
      position: dropTarget.position,
    };
  }
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
  const isParentRichText = isRichTextTree({
    instances,
    props,
    metas,
    instanceId: parentId,
  });
  if (!isParentRichText) {
    return;
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
      component: elementComponent,
      tag: "span",
      children: parentInstance.children.slice(0, position),
    };
    newChildren.push({ type: "id", value: leftSpan.id });
    instances.set(leftSpan.id, leftSpan);
    newPosition = 1;
  }
  // create right span when not in the end
  if (position < parentInstance.children.length) {
    const rightSpan: Instance = {
      id: nanoid(),
      type: "instance",
      component: elementComponent,
      tag: "span",
      children: parentInstance.children.slice(position),
    };
    newChildren.push({ type: "id", value: rightSpan.id });
    instances.set(rightSpan.id, rightSpan);
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
  dropTarget: DroppableTarget
): undefined | DroppableTarget => {
  dropTarget = getCollectionDropTarget(instances, dropTarget) ?? dropTarget;
  dropTarget =
    getSlotFragmentDropTargetMutable(instances, dropTarget) ?? dropTarget;
  dropTarget =
    wrapEditableChildrenAroundDropTargetMutable(
      instances,
      props,
      metas,
      dropTarget
    ) ?? dropTarget;
  return dropTarget;
};
