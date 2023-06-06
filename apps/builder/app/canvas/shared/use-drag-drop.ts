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
import {
  instancesStore,
  registeredComponentMetasStore,
} from "~/shared/nano-states";
import { textEditingInstanceSelectorStore } from "~/shared/nano-states";
import { publish, useSubscribe } from "~/shared/pubsub";
import {
  findClosestDroppableComponentIndex,
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
    dropTargetChange: undefined | ItemDropTarget;
    placementIndicatorChange: undefined | Placement;
  }
}

type Origin = "canvas" | "panel";

export type DragStartPayload =
  | { origin: Origin; type: "insert"; dragComponent: Instance["component"] }
  | {
      origin: Origin;
      type: "reparent";
      dragInstanceSelector: InstanceSelector;
    };

export type DragEndPayload = {
  isCanceled: boolean;
};

export type DragMovePayload = { canvasCoordinates: Point };

const findClosestRichTextInstanceSelector = (
  instanceSelector: InstanceSelector
) => {
  const instances = instancesStore.get();
  const metas = registeredComponentMetasStore.get();
  for (const instanceId of instanceSelector) {
    const instance = instances.get(instanceId);
    if (
      instance !== undefined &&
      metas.get(instance.component)?.type === "rich-text"
    ) {
      return getAncestorInstanceSelector(instanceSelector, instanceId);
    }
  }
  return;
};

const findClosestDroppableInstanceSelector = (
  instanceSelector: InstanceSelector,
  dragPayload: DragStartPayload
) => {
  const instances = instancesStore.get();
  let dragComponent: undefined | string;
  if (dragPayload.type === "insert") {
    dragComponent = dragPayload.dragComponent;
  }
  if (dragPayload.type === "reparent") {
    dragComponent = instances.get(
      dragPayload.dragInstanceSelector[0]
    )?.component;
  }
  if (dragComponent === undefined) {
    return;
  }

  const componentSelector: string[] = [];
  for (const instanceId of instanceSelector) {
    const component = instances.get(instanceId)?.component;
    if (component === undefined) {
      return;
    }
    componentSelector.push(component);
  }

  const droppableIndex = findClosestDroppableComponentIndex(
    registeredComponentMetasStore.get(),
    componentSelector,
    [dragComponent]
  );
  if (droppableIndex === -1) {
    return;
  }
  const droppableInstanceSelector = instanceSelector.slice(droppableIndex);
  return droppableInstanceSelector;
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

export const useDragAndDrop = () => {
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
        return;
      }

      const dropInstanceSelector = dropTarget.data;

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
        newDropInstanceSelector,
        dragPayload
      );
      if (droppableInstanceSelector === undefined) {
        return;
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
        return;
      }

      return { data: droppableInstanceSelector, element };
    },

    onDropTargetChange(dropTarget) {
      publish({
        type: "dropTargetChange",
        payload:
          dropTarget === undefined
            ? undefined
            : {
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
      if (
        areInstanceSelectorsEqual(
          instanceSelector,
          textEditingInstanceSelectorStore.get()
        )
      ) {
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
          origin: "canvas",
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
    if (dropTarget === undefined) {
      publish({
        type: "placementIndicatorChange",
        payload: undefined,
      });
      return;
    }
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
          parentSelector: dropTarget.itemSelector,
          position: dropTarget.indexWithinChildren,
        });
      }
      if (dragPayload.type === "reparent") {
        reparentInstance(dragPayload.dragInstanceSelector, {
          parentSelector: dropTarget.itemSelector,
          position: dropTarget.indexWithinChildren,
        });
      }
    }

    state.current = { ...initialState };
  });
};
