import { useLayoutEffect, useRef } from "react";
import {
  useRootInstance,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { findInstanceById, getInstancePath } from "~/shared/tree-utils";
import {
  type DropTarget,
  useAutoScroll,
  useDrag,
  useDrop,
} from "@webstudio-is/design-system";
import {
  publish,
  useSubscribe,
  type Instance,
  components as primitives,
} from "@webstudio-is/react-sdk";

export type DropTargetChangePayload = {
  rect: DropTarget<null>["rect"];
  placement: DropTarget<null>["placement"];
  position: number;
  instanceId: Instance["id"];
  component: Instance["component"];
};

export type DragStartPayload = {
  origin: "panel" | "canvas";
  dragItem: Instance;
};

export type DragEndPayload = { origin: "panel" | "canvas" };

export type DragMovePayload = { canvasCoordinates: { x: number; y: number } };

const initialState = {
  dropTarget: undefined as DropTarget<Instance> | undefined,
  dragItem: undefined as Instance | undefined,
};

export const useDragAndDrop = () => {
  const [rootInstance] = useRootInstance();
  const [textEditingInstanceId] = useTextEditingInstanceId();

  const state = useRef({ ...initialState });

  const autoScrollHandlers = useAutoScroll({ fullscreen: true });

  const getDefaultDropTarget = () => {
    const element = rootInstance && document.getElementById(rootInstance.id);

    // Should never happen
    if (!element || !rootInstance) {
      throw new Error("Could not find root instance element");
    }

    return { element, data: rootInstance };
  };

  const dropHandlers = useDrop<Instance>({
    isDropTarget(element) {
      return (
        (rootInstance !== undefined &&
          element.id !== "" &&
          findInstanceById(rootInstance, element.id)) ||
        false
      );
    },

    // This must be fast, it can be called multiple times per pointer move
    swapDropTarget(dropTarget) {
      const { dragItem } = state.current;

      if (!dropTarget || dragItem === undefined || rootInstance === undefined) {
        return getDefaultDropTarget();
      }

      if (dropTarget.data.id === rootInstance.id) {
        return dropTarget;
      }

      const path = getInstancePath(rootInstance, dropTarget.data.id);
      path.reverse();

      if (dropTarget.nearEdge) {
        path.shift();
      }

      // Don't allow to drop inside drag item or any of its children
      const dragItemIndex = path.findIndex(
        (instance) => instance.id === dragItem.id
      );
      if (dragItemIndex !== -1) {
        path.splice(0, dragItemIndex + 1);
      }

      const data = path.find((instance) =>
        primitives[instance.component].canAcceptChild()
      );

      if (!data) {
        return getDefaultDropTarget();
      }

      if (data.id === dropTarget.data.id) {
        return dropTarget;
      }

      const element = data && document.getElementById(data.id);

      if (element === null) {
        return getDefaultDropTarget();
      }

      return { data, element };
    },

    onDropTargetChange(dropTarget) {
      state.current.dropTarget = dropTarget;
      publish<"dropTargetChange", DropTargetChangePayload>({
        type: "dropTargetChange",
        payload: {
          rect: dropTarget.rect,
          placement: dropTarget.placement,
          position: dropTarget.indexWithinChildren,

          // @todo: use ShalowInstance
          instanceId: dropTarget.data.id,
          component: dropTarget.data.component,
        },
      });
    },
  });

  const dragHandlers = useDrag<Instance>({
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
    onMove: (point) => {
      dropHandlers.handleMove(point);
      autoScrollHandlers.handleMove(point);
    },
    onEnd() {
      dropHandlers.handleEnd();
      autoScrollHandlers.setEnabled(false);

      publish<"dragEnd", DragEndPayload>({
        type: "dragEnd",
        payload: { origin: "canvas" },
      });

      const { dropTarget, dragItem } = state.current;

      if (dropTarget && dragItem) {
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
              position: dropTarget.indexWithinChildren,
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
    dropHandlers.rootRef(document.body);
    dragHandlers.rootRef(document.body);
    window.addEventListener("scroll", dropHandlers.handleScroll);

    return () => {
      dropHandlers.rootRef(null);
      dragHandlers.rootRef(null);
      window.removeEventListener("scroll", dropHandlers.handleScroll);
    };
  }, [dragHandlers, dropHandlers, autoScrollHandlers]);

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
      dropHandlers.handleMove(canvasCoordinates);
      autoScrollHandlers.handleMove(canvasCoordinates);
    }
  );

  useSubscribe<"dragEnd", DragEndPayload>("dragEnd", ({ origin }) => {
    if (origin === "panel") {
      dropHandlers.handleEnd();
      autoScrollHandlers.setEnabled(false);

      const { dropTarget, dragItem } = state.current;

      if (dropTarget && dragItem) {
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
              position: dropTarget.indexWithinChildren,
            },
          },
        });
      }

      state.current = { ...initialState };
    }
  });
};
