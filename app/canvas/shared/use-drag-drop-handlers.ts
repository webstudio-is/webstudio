import { useState } from "react";
import ObjectId from "bson-objectid";
import memoize from "lodash.memoize";
import { type Instance } from "@webstudio-is/sdk";
import { type InitialDragData, type DragData } from "~/shared/component";
import {
  type InstanceInsertionSpec,
  type InstanceReparentingSpec,
} from "~/shared/tree-utils";
import {
  findClosestChild,
  findInsertionIndex,
  getDragOverInfo,
} from "~/shared/dom-utils";
import { useDragData, useSelectedInstance } from "./nano-values";
import { publish, useSubscribe } from "./pubsub";
//import {usePointerOutline} from './use-pointer-outline'

// Avoid recalculating rects for each node during dragging.
const getBoundingClientRect = memoize((element) =>
  element.getBoundingClientRect()
);

const getComputedStyle = memoize((element) => window.getComputedStyle(element));

export const useDragDropHandlers = ({
  rootInstance,
}: {
  rootInstance: Instance;
}): {
  instanceInsertionSpec?: InstanceInsertionSpec;
  instanceReparentingSpec?: InstanceReparentingSpec;
} => {
  const [selectedInstance, setSelectedInstance] = useSelectedInstance();
  const [instanceInsertionSpec, setInstanceInsertionSpec] =
    useState<InstanceInsertionSpec>();
  const [instanceReparentingSpec, setInstanceReparentingSpec] =
    useState<InstanceReparentingSpec>();
  const [dragData, setDragData] = useDragData();

  const insert = ({
    parentId,
    component,
    position,
  }: {
    parentId: Instance["id"];
    component: Instance["component"];
    position: DragData["position"];
  }) => {
    const instanceInsertionSpec = {
      parentId,
      component,
      position,
      id: ObjectId().toString(),
    } as const;
    setInstanceInsertionSpec(instanceInsertionSpec);
    publish<"syncInstanceInsertion", InstanceInsertionSpec>({
      type: "syncInstanceInsertion",
      payload: instanceInsertionSpec,
    });
  };

  const clearCaches = () => {
    if (getBoundingClientRect.cache?.clear) getBoundingClientRect.cache.clear();
    if (getComputedStyle.cache?.clear) getComputedStyle.cache.clear();
  };

  useSubscribe<"dragStartComponent">("dragStartComponent", () => {
    setSelectedInstance(undefined);
  });

  useSubscribe<"dragEndComponent">("dragEndComponent", () => {
    clearCaches();
    if (dragData === undefined) return;
    insert({
      parentId: dragData.id,
      component: dragData.component,
      position: dragData.position,
    });
    setDragData(undefined);
  });

  useSubscribe<"dragEndInstance", Instance["id"]>("dragEndInstance", (id) => {
    clearCaches();

    if (
      dragData === undefined ||
      // Can't reparent an instance inside itself
      dragData.id === id
    ) {
      return;
    }

    const instanceReparentingSpec = {
      parentId: dragData.id,
      position: dragData.position,
      id,
    };
    setInstanceReparentingSpec(instanceReparentingSpec);
    setDragData(undefined);
    publish<"syncInstanceReparenting", InstanceReparentingSpec>({
      type: "syncInstanceReparenting",
      payload: instanceReparentingSpec,
    });
  });

  //const updatePointerOutline = usePointerOutline();
  useSubscribe<"dragComponent", InitialDragData>(
    "dragComponent",
    ({ currentOffset, component }) => {
      // updatePointerOutline(currentOffset)
      const dragOver = getDragOverInfo(currentOffset, getBoundingClientRect);

      if (dragOver.element === undefined) return;

      const closestChild = findClosestChild(
        dragOver.element,
        currentOffset,
        getBoundingClientRect,
        getComputedStyle
      );

      let insertionIndex = 0;

      // When element has children.
      if (dragOver.element !== undefined && closestChild !== undefined) {
        insertionIndex = findInsertionIndex(dragOver, closestChild);
      }

      setDragData({
        id: dragOver.element.id,
        component,
        currentOffset,
        position: insertionIndex,
      });
    }
  );

  useSubscribe<"insertComponent", { component: Instance["component"] }>(
    "insertComponent",
    ({ component }) => {
      if (selectedInstance === undefined) {
        setSelectedInstance(rootInstance);
      }
      insert({
        component,
        position: "end",
        parentId: selectedInstance?.id ?? rootInstance.id,
      });
    }
  );

  return { instanceInsertionSpec, instanceReparentingSpec };
};
