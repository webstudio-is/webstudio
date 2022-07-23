import React, { useEffect } from "react";
import { useRootInstance } from "~/shared/nano-states";
import { useDrag } from "~/shared/design-system/components/primitives/dnd";
import { useDropTarget } from "~/shared/design-system/components/primitives/dnd";
import { findInstanceById, getInstancePath } from "~/shared/tree-utils";
import { primitives } from "~/shared/canvas-components";
import { type Instance } from "@webstudio-is/react-sdk";

export const useDragAndDrop = () => {
  const [rootInstance] = useRootInstance();

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
      // if (rootInstance === undefined) {
      //   return;
      // }

      // let path = getInstancePath(rootInstance, event.target.id);
      // if (path.length === 0) {
      //   path = [rootInstance];
      // }

      // const _targetInstance = path.reverse().find((instance) => {
      //   return primitives[instance.component].canAcceptChild();
      // });

      // @todo: take area into account
      // but not sure we can use event.area, we want targetInstance's area actually

      console.log("onDropTargetChange", dropTarget);
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
      // placementHandlers.handleMove(poiterCoordinate);
    },
    onEnd() {
      dropTargetHandlers.handleEnd();
      // autoScrollHandlers.setEnabled(false);
      // placementHandlers.handleEnd();
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
