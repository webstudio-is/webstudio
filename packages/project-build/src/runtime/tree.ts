import {
  blockComponent,
  collectionComponent,
  elementComponent,
  type Instance,
  type Instances,
  type Props,
  type WebstudioFragment,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import {
  findClosestContainer,
  isRichTextTree,
  isTreeSatisfyingContentModel,
} from "./content-model";
import { findClosestInstanceMatchingFragment } from "./matcher";
import { getSlotFragmentDropTargetMutable } from "./slot";
import type { InstancePath, InstanceSelector } from "./instance-path";

export type { InstanceSelector } from "./instance-path";

export type DroppableTarget = {
  parentSelector: InstanceSelector;
  position: number | "end";
};

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

  return self.every((instanceId, index) => {
    return instanceId === descendant[descendant.length - self.length + index];
  });
};

const getInstancePathSiblingIndex = (instancePath: InstancePath) => {
  const selectedItem = instancePath[0];
  const parentItem = instancePath[1];
  if (selectedItem === undefined || parentItem === undefined) {
    return -1;
  }
  return parentItem.instance.children.findIndex(
    (child) => child.type === "id" && child.value === selectedItem.instance.id
  );
};

export const sortInstancePathsForChildMutation = <
  Item extends { instancePath: InstancePath },
>(
  items: Item[]
) =>
  [...items].sort((left, right) => {
    const depthDiff = right.instancePath.length - left.instancePath.length;
    if (depthDiff !== 0) {
      return depthDiff;
    }
    return (
      getInstancePathSiblingIndex(right.instancePath) -
      getInstancePathSiblingIndex(left.instancePath)
    );
  });

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
  return newPosition + 1;
};

export const wrapEditableChildrenAroundDropTargetMutable = (
  instances: Instances,
  props: Props,
  metas: Map<string, WsComponentMeta>,
  dropTarget: DroppableTarget,
  createId: () => string
) => {
  const [parentId] = dropTarget.parentSelector;
  const parentInstance = instances.get(parentId);
  if (parentInstance === undefined || parentInstance.children.length === 0) {
    return;
  }
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
  if (position !== 0) {
    const leftSpan: Instance = {
      id: createId(),
      type: "instance",
      component: elementComponent,
      tag: "span",
      children: parentInstance.children.slice(0, position),
    };
    newChildren.push({ type: "id", value: leftSpan.id });
    instances.set(leftSpan.id, leftSpan);
    newPosition = 1;
  }
  if (position < parentInstance.children.length) {
    const rightSpan: Instance = {
      id: createId(),
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
  dropTarget: DroppableTarget,
  createId: () => string
): undefined | DroppableTarget => {
  dropTarget = getCollectionDropTarget(instances, dropTarget) ?? dropTarget;
  dropTarget =
    getSlotFragmentDropTargetMutable(instances, dropTarget, createId) ??
    dropTarget;
  dropTarget =
    wrapEditableChildrenAroundDropTargetMutable(
      instances,
      props,
      metas,
      dropTarget,
      createId
    ) ?? dropTarget;
  return dropTarget;
};

export const canDropInstanceSelector = ({
  dragSelector,
  dropSelector,
  instances,
  props,
  metas,
  htmlTagsByInstanceId,
  contentMode = false,
}: {
  dragSelector: InstanceSelector;
  dropSelector: InstanceSelector;
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  htmlTagsByInstanceId?: Map<Instance["id"], string>;
  contentMode?: boolean;
}) => {
  if (contentMode) {
    const parentInstance = instances.get(dropSelector[0]);
    if (parentInstance?.component !== blockComponent) {
      return false;
    }
    if (dropSelector[0] !== dragSelector[1]) {
      return false;
    }
  }
  const containerSelector = findClosestContainer({
    metas,
    props,
    instances,
    instanceSelector: dropSelector,
    htmlTagsByInstanceId,
  });
  if (dropSelector.length !== containerSelector.length) {
    return false;
  }
  return isTreeSatisfyingContentModel({
    instances,
    metas,
    props,
    instanceSelector: [dragSelector[0], ...dropSelector],
    htmlTagsByInstanceId,
  });
};

export type DragInsertPayload = {
  type: "insert";
  component: Instance["component"];
  fragment?: Pick<WebstudioFragment, "children" | "instances" | "props">;
};

export type DragReparentPayload = {
  type: "reparent";
  instanceSelector: InstanceSelector;
};

export const findClosestDroppableInstanceSelector = ({
  instanceSelector,
  dragPayload,
  instances,
  props,
  metas,
  htmlTagsByInstanceId,
}: {
  instanceSelector: InstanceSelector;
  dragPayload: DragInsertPayload | DragReparentPayload;
  instances: Instances;
  props: Props;
  metas: Map<Instance["component"], WsComponentMeta>;
  htmlTagsByInstanceId?: Map<Instance["id"], string>;
}) => {
  const containerSelector = findClosestContainer({
    metas,
    props,
    instances,
    instanceSelector,
    htmlTagsByInstanceId,
  });

  let droppableIndex = -1;
  if (dragPayload.type === "insert") {
    if (dragPayload.component === elementComponent) {
      droppableIndex = 0;
    } else if (dragPayload.fragment !== undefined) {
      droppableIndex = findClosestInstanceMatchingFragment({
        instances,
        props,
        metas,
        instanceSelector: containerSelector,
        fragment: dragPayload.fragment,
      });
    }
  } else {
    const dropInstanceSelector = [
      dragPayload.instanceSelector[0],
      ...containerSelector,
    ];
    droppableIndex = isTreeSatisfyingContentModel({
      instances,
      props,
      metas,
      instanceSelector: dropInstanceSelector,
      htmlTagsByInstanceId,
    })
      ? 0
      : -1;
  }

  return droppableIndex === -1
    ? undefined
    : containerSelector.slice(droppableIndex);
};
