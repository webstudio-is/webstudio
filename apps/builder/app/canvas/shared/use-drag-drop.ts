import { useLayoutEffect, useRef } from "react";
import type { Instance } from "@webstudio-is/project-build";
import {
  type Point,
  type Placement,
  type ItemDropTarget,
  useAutoScroll,
  useDrag,
  useDrop,
  computeIndicatorPlacement,
} from "@webstudio-is/design-system";
import { getComponentMeta } from "@webstudio-is/react-sdk";
import {
  instancesStore,
  selectedPageStore,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { publish, useSubscribe } from "~/shared/pubsub";
import {
  insertNewComponentInstance,
  reparentInstance,
} from "~/shared/instance-utils";
import {
  getElementByInstanceSelector,
  getInstanceIdFromElement,
  getInstanceSelectorFromElement,
} from "~/shared/dom-utils";
import {
  type InstanceSelector,
  getAncestorInstanceSelector,
  areInstanceSelectorsEqual,
} from "~/shared/tree-utils";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    dragEnd: DragEndPayload;
    dragMove: DragMovePayload;
    dragStart: DragStartPayload;
    dropTargetChange: ItemDropTarget;
    placementIndicatorChange: Placement;
  }
}

export type DragStartPayload =
  | { type: "insert"; dragComponent: Instance["component"] }
  | { type: "reparent"; dragInstanceSelector: InstanceSelector };

export type DragEndPayload = {
  isCanceled: boolean;
};

export type DragMovePayload = { canvasCoordinates: Point };

const findClosestRichTextInstanceSelector = (
  instanceSelector: InstanceSelector
) => {
  const instances = instancesStore.get();
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    if (
      instance !== undefined &&
      getComponentMeta(instance.component)?.type === "rich-text"
    ) {
      return getAncestorInstanceSelector(instanceSelector, instanceId);
    }
  }
  return;
};

const findClosestDroppableInstanceSelector = (
  instanceSelector: InstanceSelector
) => {
  const instances = instancesStore.get();
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    if (instance !== undefined) {
      const meta = getComponentMeta(instance.component);
      if (meta?.type === "body" || meta?.type === "container") {
        return getAncestorInstanceSelector(instanceSelector, instanceId);
      }
    }
  }
  return;
};

const initialState: {
  dropTarget: ItemDropTarget | undefined;
  dragPayload: DragStartPayload | undefined;
} = {
  dropTarget: undefined,
  dragPayload: undefined,
};

const sharedDropOptions = {
  getValidChildren: (parent: Element) => {
    return Array.from(parent.children).filter(
      (child) => getInstanceIdFromElement(child) !== undefined
    );
  },
};

const getDefaultDropTarget = () => {
  const selectedPage = selectedPageStore.get();
  if (selectedPage === undefined) {
    throw new Error("Could not find selected page");
  }
  const rootInstanceSelector = [selectedPage.rootInstanceId];
  const element = getElementByInstanceSelector(rootInstanceSelector);
  // Should never happen
  if (element === undefined) {
    throw new Error("Could not find root instance element");
  }
  return { element, data: rootInstanceSelector };
};

export const useDragAndDrop = () => {
  const [textEditingInstanceId] = useTextEditingInstanceId();

  const state = useRef({ ...initialState });

  const autoScrollHandlers = useAutoScroll({ fullscreen: true });

  const dropHandlers = useDrop<InstanceSelector>({
    ...sharedDropOptions,

    elementToData(element) {
      const instanceSelector = getInstanceSelectorFromElement(element);
      if (instanceSelector === undefined) {
        return false;
      }
      return instanceSelector;
    },

    // This must be fast, it can be called multiple times per pointer move
    swapDropTarget(dropTarget) {
      const { dragPayload } = state.current;

      if (dropTarget === undefined || dragPayload === undefined) {
        return getDefaultDropTarget();
      }

      const dropInstanceSelector = dropTarget.data;
      if (dropInstanceSelector.length === 1) {
        return dropTarget;
      }

      const newDropInstanceSelector = dropInstanceSelector.slice();
      if (dropTarget.area !== "center") {
        newDropInstanceSelector.shift();
      }

      // Don't allow to drop inside drag item or any of its children
      if (dragPayload.type === "reparent") {
        const [dragInstanceId] = dragPayload.dragInstanceSelector;
        const dragInstanceIndex =
          newDropInstanceSelector.indexOf(dragInstanceId);
        if (dragInstanceIndex !== -1) {
          newDropInstanceSelector.splice(0, dragInstanceIndex + 1);
        }
      }

      const droppableInstanceSelector = findClosestDroppableInstanceSelector(
        newDropInstanceSelector
      );
      if (droppableInstanceSelector === undefined) {
        return getDefaultDropTarget();
      }

      if (
        areInstanceSelectorsEqual(
          dropInstanceSelector,
          droppableInstanceSelector
        )
      ) {
        return dropTarget;
      }

      const element = getElementByInstanceSelector(droppableInstanceSelector);
      if (element === undefined) {
        return getDefaultDropTarget();
      }

      return { data: droppableInstanceSelector, element };
    },

    onDropTargetChange(dropTarget) {
      publish({
        type: "dropTargetChange",
        payload: {
          placement: dropTarget.placement,
          indexWithinChildren: dropTarget.indexWithinChildren,
          itemSelector: dropTarget.data,
        },
      });
    },
  });

  const dragHandlers = useDrag<InstanceSelector>({
    elementToData(element) {
      const instanceSelector = getInstanceSelectorFromElement(element);
      if (instanceSelector === undefined) {
        return false;
      }
      // cannot drag root
      if (instanceSelector.length === 1) {
        return false;
      }
      // cannot drag while editing text
      if (instanceSelector[0] === textEditingInstanceId) {
        return false;
      }
      // When trying to drag an instance inside editor, drag the editor instead
      return (
        findClosestRichTextInstanceSelector(instanceSelector) ??
        instanceSelector
      );
    },

    onStart({ data: dragInstanceSelector }) {
      publish({
        type: "dragStart",
        payload: {
          type: "reparent",
          dragInstanceSelector,
        },
      });
    },
    onMove: (point) => {
      publish({
        type: "dragMove",
        payload: { canvasCoordinates: point },
      });
    },
    onEnd({ isCanceled }) {
      publish({
        type: "dragEnd",
        payload: { isCanceled },
      });
    },
  });

  // We have to use useLayoutEffect to setup the refs
  // because we want to use <body> as a root.
  // We prefer useLayoutEffect over useEffect
  // because it's closer in the life cycle to when React noramlly calls the "ref" callbacks.
  useLayoutEffect(() => {
    dropHandlers.rootRef(document.documentElement);
    dragHandlers.rootRef(document.documentElement);
    window.addEventListener("scroll", dropHandlers.handleScroll);

    return () => {
      dropHandlers.rootRef(null);
      dragHandlers.rootRef(null);
      window.removeEventListener("scroll", dropHandlers.handleScroll);
    };
  }, [dragHandlers, dropHandlers, autoScrollHandlers]);

  useSubscribe("cancelCurrentDrag", () => {
    dragHandlers.cancelCurrentDrag();
  });

  // Handle drag from the panel
  // ================================================================

  useSubscribe("dragStart", (dragPayload) => {
    state.current.dragPayload = dragPayload;
    autoScrollHandlers.setEnabled(true);
    dropHandlers.handleStart();
  });

  useSubscribe("dragMove", ({ canvasCoordinates }) => {
    dropHandlers.handleMove(canvasCoordinates);
    autoScrollHandlers.handleMove(canvasCoordinates);
  });

  useSubscribe("dropTargetChange", (dropTarget) => {
    state.current.dropTarget = dropTarget;
    const element = getElementByInstanceSelector(dropTarget.itemSelector);
    if (element === undefined) {
      return;
    }
    publish({
      type: "placementIndicatorChange",
      payload: computeIndicatorPlacement({
        ...sharedDropOptions,
        element,
        placement: dropTarget.placement,
      }),
    });
  });

  useSubscribe("dragEnd", ({ isCanceled }) => {
    dropHandlers.handleEnd({ isCanceled });
    autoScrollHandlers.setEnabled(false);
    const { dropTarget, dragPayload } = state.current;

    if (dropTarget && dragPayload && isCanceled === false) {
      if (dragPayload.type === "insert") {
        insertNewComponentInstance(dragPayload.dragComponent, {
          parentId: dropTarget.itemSelector[0],
          position: dropTarget.indexWithinChildren,
        });
      }
      if (dragPayload.type === "reparent") {
        reparentInstance(dragPayload.dragInstanceSelector[0], {
          parentId: dropTarget.itemSelector[0],
          position: dropTarget.indexWithinChildren,
        });
      }
    }

    state.current = { ...initialState };
  });
};
