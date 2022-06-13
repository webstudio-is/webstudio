import { useState } from "react";
import { publish, useSubscribe } from "@webstudio-is/sdk";
import { type DragData, type DropData } from "~/shared/component";
import { findInstanceById } from "~/shared/tree-utils";
import {
  findClosestChild,
  findInsertionIndex,
  getDragOverInfo,
} from "~/shared/dom-utils";
import { useDropData, useSelectedInstance } from "./nano-states";
import { useRootInstance } from "~/shared/nano-states";
import memoize from "lodash.memoize";
//import {usePointerOutline} from './use-pointer-outline'

const getBoundingClientRect = memoize((element: Element | HTMLElement) =>
  element.getBoundingClientRect()
);

const getComputedStyle = memoize((element: Element | HTMLElement) =>
  window.getComputedStyle(element)
);

export const useDragDropHandlers = () => {
  const [rootInstance] = useRootInstance();
  const [, setSelectedInstance] = useSelectedInstance();
  const [dropData, setDropData] = useDropData();
  const [dragData, setDragData] = useState<DragData>();

  useSubscribe<"dragStartInstance">("dragStartInstance", () => {
    setSelectedInstance(undefined);
  });

  useSubscribe<"dragEndInstance">("dragEndInstance", () => {
    // Cleanup
    if (getBoundingClientRect.cache?.clear) getBoundingClientRect.cache.clear();
    if (getComputedStyle.cache?.clear) getComputedStyle.cache.clear();
    setDropData(undefined);
    setDragData(undefined);

    if (
      rootInstance === undefined ||
      dropData === undefined ||
      dragData === undefined ||
      // Can't reparent an instance inside itself
      dropData.instance.id === dragData.instance.id
    ) {
      return;
    }

    const isNew =
      findInstanceById(rootInstance, dragData.instance.id) === undefined;

    const data = {
      instance: dragData.instance,
      dropData,
    };

    if (isNew) {
      publish<"insertInstance", typeof data>({
        type: "insertInstance",
        payload: data,
      });
      return;
    }

    publish<"reparentInstance", typeof data>({
      type: "reparentInstance",
      payload: data,
    });
  });

  //const updatePointerOutline = usePointerOutline();
  useSubscribe<"dragInstance", DragData>("dragInstance", (dragData) => {
    const { currentOffset } = dragData;
    // updatePointerOutline(currentOffset)
    const dragOver = getDragOverInfo(currentOffset, getBoundingClientRect);

    if (rootInstance === undefined || dragOver.element === undefined) return;

    const dropInstance = findInstanceById(rootInstance, dragOver.element.id);

    if (dropInstance === undefined) return;

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

    const dropData = {
      instance: dropInstance,
      position: insertionIndex,
    };

    setDragData(dragData);
    setDropData(dropData);
    publish<"dropPreview", { dropData: DropData; dragData: DragData }>({
      type: "dropPreview",
      payload: { dropData, dragData },
    });
  });
};
