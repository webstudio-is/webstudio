import React, { useEffect } from "react";
import { useRootInstance } from "~/shared/nano-states";
import {
  useDropTarget,
  useDrag,
  usePlacement,
} from "~/shared/design-system/components/primitives/dnd";
import { findInstanceById, getInstancePath } from "~/shared/tree-utils";
import { primitives } from "~/shared/canvas-components";
import { type Instance } from "@webstudio-is/react-sdk";

export const useDragAndDrop = () => {
  const [rootInstance] = useRootInstance();

  const placementHandlers = usePlacement({
    onPlacementChange: (placement) => {
      console.log(placement);
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
      placementHandlers.handleTargetChange(dropTarget.element);
    },
  });

  const dragProps = useDrag({
    onStart(_event) {
      // const id = event.target.dataset.id;
      // if (id == null) {
      //   event.cancel();
      //   return;
      // }
      // setDragItemId(id);
      // autoScrollHandlers.setEnabled(true);
    },
    onMove: (poiterCoordinate) => {
      dropTargetHandlers.handleMove(poiterCoordinate);
      // autoScrollHandlers.handleMove(poiterCoordinate);
      placementHandlers.handleMove(poiterCoordinate);
    },
    onEnd() {
      dropTargetHandlers.handleEnd();
      // autoScrollHandlers.setEnabled(false);
      placementHandlers.handleEnd();
      // setDragItemId(undefined);
      // setPalcement(undefined);
      // dropTargetId.current = undefined;
    },
  });

  // We want to use <body> as a root for drag items.
  // The DnD hooks weren't designed for that.
  // This is a temporary solution.
  //
  // NOTE: maybe use root instance's element as a root?
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

    const rootElement = document.body;

    rootElement.addEventListener("pointerdown", handlePointerDown);
    rootElement.addEventListener("scroll", handleScroll);
    dropTargetHandlers.rootRef(rootElement);
    () => {
      rootElement.removeEventListener("pointerdown", handlePointerDown);
      rootElement.removeEventListener("scroll", handleScroll);
      dropTargetHandlers.rootRef(null);
    };

    // NOTE: need to make the dependencies more stable,
    // because as is this will fire on every render
  }, [dragProps, dropTargetHandlers]);
};
