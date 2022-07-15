import { useState } from "react";
import { publish, useSubscribe } from "@webstudio-is/sdk";
import { type DragData, type DropData } from "~/shared/canvas-components";
import { findInstanceById } from "~/shared/tree-utils";
import {
  findClosestChild,
  findInsertionIndex,
  getDragOverMeta,
} from "~/shared/dom-utils";
import {
  useDragState,
  useDropData,
  useHoveredElement,
  useHoveredInstance,
  useSelectedInstance,
} from "./nano-states";
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
  const [, setHoveredInstance] = useHoveredInstance();
  const [, setHoveredElement] = useHoveredElement();
  const [dropData, setDropData] = useDropData();
  const [dragData, setDragData] = useState<DragData>();
  const [, setDragState] = useDragState();

  useSubscribe<"dragStartInstance">("dragStartInstance", () => {
    setSelectedInstance(undefined);
    setDragState("dragging");
  });

  useSubscribe<"dragEndInstance">("dragEndInstance", () => {
    // Cleanup
    if (getBoundingClientRect.cache?.clear) getBoundingClientRect.cache.clear();
    if (getComputedStyle.cache?.clear) getComputedStyle.cache.clear();
    setDragState(undefined);
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
    if (rootInstance === undefined) {
      return;
    }

    const { currentOffset } = dragData;
    // updatePointerOutline(currentOffset)

    const dragOverMeta = getDragOverMeta({
      offset: currentOffset,
      getBoundingClientRect,
      rootInstance,
    });

    if (dragOverMeta === undefined) {
      return;
    }

    const closestChildMeta = findClosestChild(
      currentOffset,
      getBoundingClientRect,
      getComputedStyle,
      dragOverMeta.element
    );

    let position = 0;

    // When element has children, we need to decide at what position we drop.
    if (dragOverMeta.element !== undefined && closestChildMeta !== undefined) {
      position = findInsertionIndex(dragOverMeta, closestChildMeta);
    }

    const dropData: DropData = {
      instance: dragOverMeta.instance,
      position,
    };

    setDragData(dragData);
    setDropData(dropData);
    setHoveredInstance(dragOverMeta.instance);
    setHoveredElement(dragOverMeta.element);
    publish<"dropPreview", { dropData: DropData; dragData: DragData }>({
      type: "dropPreview",
      payload: { dropData, dragData },
    });
  });
};
