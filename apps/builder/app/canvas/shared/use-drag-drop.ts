import {
  getComponentTemplateData,
  getImageAssetFragment,
  insertImageAssetAt,
  insertWebstudioComponentAt,
} from "~/shared/instance-utils/insert";
import { reparentInstance } from "~/shared/instance-utils/mutation";
import { useLayoutEffect, useRef } from "react";
import { elementComponent, type Instance } from "@webstudio-is/sdk";
import {
  type Point,
  useAutoScroll,
  useDrag,
  useDrop,
  computeIndicatorPlacement,
} from "@webstudio-is/design-system";
import {
  $dragAndDropState,
  $propsIndex,
  $registeredComponentMetas,
  type ItemDropTarget,
} from "~/shared/nano-states";
import { $instances, $props } from "~/shared/sync/data-stores";
import { publish, useSubscribe } from "~/shared/pubsub";
import {
  getElementByInstanceSelector,
  getInstanceIdFromElement,
  getInstanceSelectorFromElement,
} from "~/shared/dom-utils";
import {
  type InstanceSelector,
  areInstanceSelectorsEqual,
  findClosestDroppableInstanceSelector,
  findClosestRichText,
} from "@webstudio-is/project-build/runtime";

declare module "~/shared/pubsub" {
  export interface PubsubMap {
    dragEnd: DragEndPayload;
    dragMove: DragMovePayload;
    dragStart: DragStartPayload;
    dropTargetChange: undefined | ItemDropTarget;
    cancelCurrentDrag: undefined;
  }
}

type Origin = "canvas" | "panel";

export type DragStartPayload =
  | { origin: Origin; type: "insert"; dragComponent: Instance["component"] }
  | { origin: Origin; type: "insertImageAsset"; assetId: string }
  | {
      origin: Origin;
      type: "reparent";
      dragInstanceSelector: InstanceSelector;
    };

export type DragEndPayload = {
  isCanceled: boolean;
};

export type DragMovePayload = { canvasCoordinates: Point };

const getRuntimeDragPayload = (dragPayload: DragStartPayload) => {
  if (dragPayload.type === "reparent") {
    return {
      type: "reparent" as const,
      instanceSelector: dragPayload.dragInstanceSelector,
    };
  }

  if (dragPayload.type === "insertImageAsset") {
    return {
      type: "insert" as const,
      component: "Image",
      fragment: getImageAssetFragment(dragPayload.assetId),
    };
  }

  return {
    type: "insert" as const,
    component: dragPayload.dragComponent,
    fragment:
      dragPayload.dragComponent === elementComponent
        ? undefined
        : getComponentTemplateData(dragPayload.dragComponent),
  };
};

const findClosestCanvasDroppableInstanceSelector = (
  instanceSelector: InstanceSelector,
  dragPayload: DragStartPayload
) => {
  const instances = $instances.get();
  const props = $props.get();
  const metas = $registeredComponentMetas.get();
  const { htmlTagsByInstanceId } = $propsIndex.get();

  return findClosestDroppableInstanceSelector({
    instanceSelector,
    instances,
    props,
    metas,
    htmlTagsByInstanceId,
    dragPayload: getRuntimeDragPayload(dragPayload),
  });
};

const initialState: {
  dropTarget: ItemDropTarget | undefined;
  dragPayload: DragStartPayload | undefined;
} = {
  dropTarget: undefined,
  dragPayload: undefined,
};

export const commitCanvasDragDrop = ({
  dropTarget,
  dragPayload,
}: {
  dropTarget: ItemDropTarget | undefined;
  dragPayload: DragStartPayload | undefined;
}) => {
  if (dropTarget === undefined || dragPayload === undefined) {
    return false;
  }

  const insertable = {
    parentSelector: dropTarget.itemSelector,
    position: dropTarget.indexWithinChildren,
  };
  if (dragPayload.type === "insert") {
    return insertWebstudioComponentAt(dragPayload.dragComponent, insertable);
  }
  if (dragPayload.type === "insertImageAsset") {
    return insertImageAssetAt(dragPayload.assetId, insertable);
  }
  if (dragPayload.type === "reparent") {
    reparentInstance(dragPayload.dragInstanceSelector, insertable);
    return true;
  }
  return false;
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

      const droppableInstanceSelector =
        findClosestCanvasDroppableInstanceSelector(
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
      // cannot drag while editing text
      if (element.closest("[contenteditable=true]")) {
        return false;
      }
      // When trying to drag an instance inside editor, drag the editor instead
      return (
        findClosestRichText({
          instanceSelector,
          instances: $instances.get(),
          props: $props.get(),
          metas: $registeredComponentMetas.get(),
          htmlTagsByInstanceId: $propsIndex.get().htmlTagsByInstanceId,
        }) ?? instanceSelector
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
      $dragAndDropState.set({
        ...$dragAndDropState.get(),
        placementIndicator: undefined,
      });
      return;
    }
    const element = getElementByInstanceSelector(dropTarget.itemSelector);
    if (element === undefined) {
      return;
    }
    $dragAndDropState.set({
      ...$dragAndDropState.get(),
      placementIndicator: computeIndicatorPlacement({
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

    if (isCanceled === false) {
      commitCanvasDragDrop({ dropTarget, dragPayload });
    }

    state.current = { ...initialState };
  });
};
