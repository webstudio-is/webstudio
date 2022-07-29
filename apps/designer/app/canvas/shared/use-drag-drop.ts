import { useLayoutEffect, useRef } from "react";
import {
  useRootInstance,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { findInstanceById, getInstancePath } from "~/shared/tree-utils";
import {
  type DropTarget,
  useAutoScroll,
  usePlacement,
  useDrag,
  useDropTarget,
} from "@webstudio-is/design-system";
import {
  publish,
  useSubscribe,
  type Instance,
  components as primitives,
} from "@webstudio-is/react-sdk";

type Rect = Pick<DOMRect, "top" | "left" | "width" | "height">;

export type DropTargetChangePayload = {
  rect: Rect;
  placementRect: Rect;
  position: number;
  instanceId: Instance["id"];
  instanceComponent: Instance["component"];
};

export type DragStartPayload = {
  origin: "panel" | "canvas";
  dragItem: Instance;
};

export type DragEndPayload = { origin: "panel" | "canvas" };

export type DragMovePayload = { canvasCoordinates: { x: number; y: number } };

const initialState = {
  dropTarget: undefined as DropTarget<Instance> | undefined,
  placement: undefined as { index: number; placementRect: Rect } | undefined,
  dragItem: undefined as Instance | undefined,
};

export const useDragAndDrop = () => {
  const [rootInstance] = useRootInstance();
  const [textEditingInstanceId] = useTextEditingInstanceId();

  const state = useRef({ ...initialState });

  const publishDropTargetChange = () => {
    const { dropTarget, placement } = state.current;
    if (dropTarget === undefined || placement === undefined) {
      return;
    }
    publish<"dropTargetChange", DropTargetChangePayload>({
      type: "dropTargetChange",
      payload: {
        rect: dropTarget.rect,
        placementRect: placement.placementRect,
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

  const useDragHandlers = useDrag<Instance>({
    isDragItem(element) {
      if (rootInstance === undefined || element.id === "") {
        return false;
      }

      const instance = findInstanceById(rootInstance, element.id);

      if (instance === undefined) {
        return false;
      }

      // We can't drag if we are editing text
      if (instance.id === textEditingInstanceId) {
        return false;
      }

      // Cannot drag root
      if (instance.id === rootInstance.id) {
        return false;
      }

      return instance;
    },
    onStart({ data: instance }) {
      state.current.dragItem = instance;

      autoScrollHandlers.setEnabled(true);

      publish<"dragStart", DragStartPayload>({
        type: "dragStart",
        payload: {
          origin: "canvas",
          dragItem: instance,
        },
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

      publish<"dragEnd", DragEndPayload>({
        type: "dragEnd",
        payload: { origin: "canvas" },
      });

      const { dropTarget, placement, dragItem } = state.current;

      if (dropTarget && placement && dragItem) {
        publish<
          "reparentInstance",
          {
            instanceId: Instance["id"];
            dropTarget: { instanceId: Instance["id"]; position: number };
          }
        >({
          type: "reparentInstance",
          payload: {
            instanceId: dragItem.id,
            dropTarget: {
              instanceId: dropTarget.data.id,
              position: placement.index,
            },
          },
        });
      }

      state.current = { ...initialState };
    },
  });

  // We have to use useLayoutEffect to setup the refs
  // because we want to use <body> as a root.
  // We prefer useLayoutEffect over useEffect
  // because it's closer in the life cycle to when React noramlly calls the "ref" callbacks.
  useLayoutEffect(() => {
    const handleScroll = () => {
      dropTargetHandlers.handleScroll();
      placementHandlers.handleScroll();
    };

    dropTargetHandlers.rootRef(document.body);
    useDragHandlers.rootRef(document.body);
    window.addEventListener("scroll", handleScroll);

    return () => {
      dropTargetHandlers.rootRef(null);
      useDragHandlers.rootRef(null);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [
    useDragHandlers,
    dropTargetHandlers,
    placementHandlers,
    autoScrollHandlers,
  ]);

  // Handle drag from the panel
  // ================================================================

  useSubscribe<"dragStart", DragStartPayload>(
    "dragStart",
    ({ origin, dragItem }) => {
      if (origin === "panel") {
        state.current.dragItem = dragItem;
        autoScrollHandlers.setEnabled(true);
      }
    }
  );

  useSubscribe<"dragMove", DragMovePayload>(
    "dragMove",
    ({ canvasCoordinates }) => {
      // @todo: This will only produce and update a drop target if the mouse is over the canvas.
      // We should figure out a way to default to the root instance as a drop target when we're not over the canvas.
      dropTargetHandlers.handleMove(canvasCoordinates);

      autoScrollHandlers.handleMove(canvasCoordinates);
      placementHandlers.handleMove(canvasCoordinates);
    }
  );

  useSubscribe<"dragEnd", DragEndPayload>("dragEnd", ({ origin }) => {
    if (origin === "panel") {
      dropTargetHandlers.handleEnd();
      autoScrollHandlers.setEnabled(false);
      placementHandlers.handleEnd();

      const { dropTarget, placement, dragItem } = state.current;

      if (dropTarget && placement && dragItem) {
        publish<
          "insertInstance",
          {
            instance: Instance;
            dropTarget: { instanceId: Instance["id"]; position: number };
          }
        >({
          type: "insertInstance",
          payload: {
            instance: dragItem,
            dropTarget: {
              instanceId: dropTarget.data.id,
              position: placement.index,
            },
          },
        });
      }

      state.current = { ...initialState };
    }
  });
};
