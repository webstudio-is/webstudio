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

// data shared between iframe and main window
export type DropTargetSharedData = {
  rect: Rect;
  placementRect: Rect;
  position: number;
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

        // @todo: adjust index if the parent stays the same
        // (account for the item being removed from the old position)
        // Can the hook do that for us automatically?
        position: placement.index,

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
      const { dragItem } = state.current;
      if (
        dragItem === undefined ||
        rootInstance === undefined ||
        dropTarget.data.id === rootInstance.id
      ) {
        return dropTarget;
      }

      const path = getInstancePath(rootInstance, dropTarget.data.id);
      path.reverse();

      if (dropTarget.area !== "center") {
        path.shift();
      }

      // Don't allow to dpop inside drag item or any of its children
      const dragItemIndex = path.findIndex((x) => x.id === dragItem.id);
      if (dragItemIndex !== -1) {
        path.splice(0, dragItemIndex + 1);
      }

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

      publish<"dragStart", { dragItem: { instance: Instance } }>({
        type: "dragStart",
        payload: { dragItem: { instance } },
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

      const { dropTarget, placement, dragItem } = state.current;

      if (dropTarget && placement && dragItem) {
        publish<
          "reparentInstance",
          {
            instance: Instance;
            dropTarget: { instanceId: Instance["id"]; position: number };
          }
        >({
          type: "reparentInstance",
          payload: {
            instance: dragItem,
            dropTarget: {
              instanceId: dropTarget.data.id,

              // @todo: adjust index if the parent stays the same
              // (account for the item being removed from the old position)
              // Can the hook do that for us automatically?
              position: placement.index,
            },
          },
        });
      }

      // if (isNew) {
      //   publish<"insertInstance", typeof data>({
      //     type: "insertInstance",
      //     payload: data,
      //   });
      // }

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
