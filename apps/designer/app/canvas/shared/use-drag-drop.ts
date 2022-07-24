import React, { useEffect, useRef } from "react";
import { useRootInstance } from "~/shared/nano-states";
import {
  useDropTarget,
  useDrag,
  usePlacement,
  useAutoScroll,
  type Rect,
  type DropTarget,
} from "~/shared/design-system/components/primitives/dnd";
import { findInstanceById, getInstancePath } from "~/shared/tree-utils";
import { primitives } from "~/shared/canvas-components";
import { publish, type Instance } from "@webstudio-is/react-sdk";

// This is used in tree-preview
// @todo: Update it to use the new events, or fire these events as well.
export type DragData = { instance: Instance };
export type DropData = {
  instance: { id: Instance["id"] };
  position: number | "end";
};
// publish<"dropPreview", { dropData: DropData; dragData: DragData }>({
//   type: "dropPreview",
//   payload: { dropData, dragData },
// });

// data shared between iframe and main window
export type DropTargetSharedData = {
  rect: Rect;
  placementRect: Rect;
  instanceId: Instance["id"];
  instanceComponent: Instance["component"];
};

const initialState = {
  dropTarget: undefined as DropTarget<Instance> | undefined,
  placement: undefined as { index: number; placementRect: Rect } | undefined,
  dragItem: undefined as Instance | undefined,
};

export const useDragAndDrop = () => {
  const [rootInstance] = useRootInstance();

  const state = useRef({ ...initialState });

  const publishDropTargetChange = () => {
    const { dropTarget, placement } = state.current;
    if (dropTarget === undefined || placement === undefined) {
      return;
    }
    publish<"dropTargetChange", DropTargetSharedData>({
      type: "dropTargetChange",
      payload: {
        rect: dropTarget.rect,
        placementRect: placement.placementRect,
        instanceId: dropTarget.data.id,
        instanceComponent: dropTarget.data.component,
      },
    });
  };

  const autoScrollHandlers = useAutoScroll({ fullScreen: true });

  const placementHandlers = usePlacement({
    onPlacementChange: (placement) => {
      state.current.placement = placement;
      publishDropTargetChange();
    },
  });

  const dropTargetHandlers = useDropTarget<Instance>({
    isDropTarget(element) {
      return (
        (rootInstance !== undefined &&
          element.id !== "" &&
          findInstanceById(rootInstance, element.id)) ||
        false
      );
    },

    isSameData(a, b) {
      return a.id === b.id;
    },

    // This must be fast, it can be called multiple times per pointer move
    swapDropTarget(dropTarget) {
      if (
        rootInstance === undefined ||
        dropTarget.data.id === rootInstance.id
      ) {
        return dropTarget;
      }

      if (
        primitives[dropTarget.data.component].canAcceptChild() &&
        dropTarget.area === "center"
      ) {
        return dropTarget;
      }

      // @todo: Don't allow to dpop inside drag item or any of its children

      const path = getInstancePath(rootInstance, dropTarget.data.id);
      path.reverse().shift();

      const data =
        path.find((instance) =>
          primitives[instance.component].canAcceptChild()
        ) || rootInstance;

      const element = document.getElementById(data.id);
      if (element == null) {
        return dropTarget;
      }

      return { data, element };
    },

    onDropTargetChange(dropTarget) {
      state.current.dropTarget = dropTarget;
      placementHandlers.handleTargetChange(dropTarget.element);

      // @todo: The line above may or may not fire publishDropTargetChange as well.
      // So we're firing duplicate events.
      // One more reason to merge useDropTarget and usePlacement.
      publishDropTargetChange();
    },
  });

  const dragProps = useDrag({
    onStart(event) {
      const instance =
        rootInstance !== undefined &&
        event.target.id !== "" &&
        findInstanceById(rootInstance, event.target.id);

      // @todo: If we can't find the data corresponding to the target element,
      // should we climb up the DOM tree for another element?
      // Should the hook do that for us?

      if (!instance || instance.id === rootInstance.id) {
        event.cancel();
        return;
      }

      state.current.dragItem = instance;

      autoScrollHandlers.setEnabled(true);

      publish<"dragStart", { dragItem: { instanceId: Instance["id"] } }>({
        type: "dragStart",
        payload: { dragItem: { instanceId: instance.id } },
      });
    },
    onMove: (poiterCoordinate) => {
      dropTargetHandlers.handleMove(poiterCoordinate);
      autoScrollHandlers.handleMove(poiterCoordinate);
      placementHandlers.handleMove(poiterCoordinate);
    },
    onEnd() {
      dropTargetHandlers.handleEnd();
      autoScrollHandlers.setEnabled(false);
      placementHandlers.handleEnd();
      publish<"dragEnd">({ type: "dragEnd" });
      state.current = { ...initialState };
    },
  });

  // We want to use <body> as a root for drag items.
  // The DnD hooks weren't designed for that.
  //
  // @todo: This is a temporary solution, need to change hooks' API.
  // Also, maybe use root instance's element as a root?
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      dragProps.onPointerDown?.(
        event as any as React.PointerEvent<HTMLElement>
      );
    };

    const handleScroll = () => {
      dropTargetHandlers.handleScroll();
      placementHandlers.handleScroll();
    };

    document.body.addEventListener("pointerdown", handlePointerDown);
    dropTargetHandlers.rootRef(document.body);
    window.addEventListener("scroll", handleScroll);

    () => {
      document.body.removeEventListener("pointerdown", handlePointerDown);
      dropTargetHandlers.rootRef(null);
      window.removeEventListener("scroll", handleScroll);
    };

    // @todo: need to make the dependencies more stable,
    // because as is this will fire on every render
  }, [dragProps, dropTargetHandlers, placementHandlers, autoScrollHandlers]);
};
