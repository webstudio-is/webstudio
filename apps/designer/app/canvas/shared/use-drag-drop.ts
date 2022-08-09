import { useLayoutEffect, useRef } from "react";
import {
  useRootInstance,
  useTextEditingInstanceId,
} from "~/shared/nano-states";
import { getInstancePath, createInstance } from "~/shared/tree-utils";
import {
  findInstanceByElement,
  getInstanceElementById,
  getInstanceIdFromElement,
} from "~/shared/dom-utils";
import {
  type DropTarget,
  type Point,
  useAutoScroll,
  useDrag,
  useDrop,
} from "@webstudio-is/design-system";
import {
  publish,
  useSubscribe,
  type Instance,
  components,
  BaseInstance,
  toBaseInstance,
} from "@webstudio-is/react-sdk";

export type DropTargetChangePayload = {
  rect: DropTarget<null>["rect"];
  placement: DropTarget<null>["placement"];
  position: number;
  instance: BaseInstance;
};

export type DragStartPayload = {
  origin: "panel" | "canvas";
  dragItem: BaseInstance;
};

export type DragEndPayload = {
  origin: "panel" | "canvas";
  isCanceled: boolean;
};

export type DragMovePayload = { canvasCoordinates: Point };

const initialState = {
  dropTarget: undefined as DropTarget<Instance> | undefined,
  dragItem: undefined as BaseInstance | undefined,
};

export const useDragAndDrop = () => {
  const [rootInstance] = useRootInstance();
  const [textEditingInstanceId] = useTextEditingInstanceId();

  const state = useRef({ ...initialState });

  const autoScrollHandlers = useAutoScroll({ fullscreen: true });

  const getDefaultDropTarget = () => {
    const element = rootInstance && getInstanceElementById(rootInstance.id);

    // Should never happen
    if (!element || !rootInstance) {
      throw new Error("Could not find root instance element");
    }

    return { element, data: rootInstance };
  };

  const dropHandlers = useDrop<Instance>({
    elementToData(element) {
      const instance =
        rootInstance !== undefined &&
        findInstanceByElement(rootInstance, element);

      return instance || false;
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

      if (dropTarget.area !== "center") {
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
        components[instance.component].canAcceptChild()
      );

      if (!data) {
        return getDefaultDropTarget();
      }

      if (data.id === dropTarget.data.id) {
        return dropTarget;
      }

      const element = data && getInstanceElementById(data.id);

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
          instance: toBaseInstance(dropTarget.data),
        },
      });
    },

    getValidChildren: (parent) => {
      return Array.from(parent.children).filter(
        (child) => getInstanceIdFromElement(child) !== undefined
      );
    },
  });

  const dragHandlers = useDrag<Instance>({
    elementToData(element) {
      if (rootInstance === undefined) {
        return false;
      }

      const instance = findInstanceByElement(rootInstance, element);

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
          dragItem: toBaseInstance(instance),
        },
      });
    },
    onMove: (point) => {
      dropHandlers.handleMove(point);
      autoScrollHandlers.handleMove(point);
    },
    onEnd({ isCanceled }) {
      dropHandlers.handleEnd();
      autoScrollHandlers.setEnabled(false);

      publish<"dragEnd", DragEndPayload>({
        type: "dragEnd",
        payload: { origin: "canvas", isCanceled },
      });

      const { dropTarget, dragItem } = state.current;

      if (dropTarget && dragItem && isCanceled === false) {
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

  useSubscribe("cancelCurrentDrag", () => {
    dragHandlers.cancelCurrentDrag();
  });

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

  useSubscribe<"dragEnd", DragEndPayload>(
    "dragEnd",
    ({ origin, isCanceled }) => {
      if (origin === "panel") {
        dropHandlers.handleEnd();
        autoScrollHandlers.setEnabled(false);

        const { dropTarget, dragItem } = state.current;

        if (dropTarget && dragItem && isCanceled === false) {
          publish<
            "insertInstance",
            {
              instance: Instance;
              dropTarget: { parentId: Instance["id"]; position: number };
            }
          >({
            type: "insertInstance",
            payload: {
              instance: createInstance({ component: dragItem.component }),
              dropTarget: {
                parentId: dropTarget.data.id,
                position: dropTarget.indexWithinChildren,
              },
            },
          });
        }

        state.current = { ...initialState };
      }
    }
  );
};
