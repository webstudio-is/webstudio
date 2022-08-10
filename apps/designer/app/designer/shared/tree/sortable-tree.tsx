import { useState, useMemo, useRef } from "react";
import { type Instance, components } from "@webstudio-is/react-sdk";
import {
  type DropTarget,
  useDrag,
  useDrop,
  useHold,
  Box,
} from "@webstudio-is/design-system";
import { findInstanceById, getInstancePath } from "~/shared/tree-utils";
import { createPortal } from "react-dom";
import { getIsExpandable } from "./tree-node";
import { BaseTree, useExpandState, type TreeProps } from "./base-tree";

export const SortableTree = (
  props: TreeProps & {
    onDragEnd: (event: {
      instanceId: Instance["id"];
      dropTarget: { instanceId: Instance["id"]; position: number };
    }) => void;
  }
) => {
  const { root, onDragEnd } = props;

  const expandState = useExpandState();

  const rootRef = useRef<HTMLElement | null>(null);

  const [dragItem, setDragItem] = useState<Instance>();
  const [dropTarget, setDropTarget] = useState<DropTarget<Instance>>();

  // @todo: not sure what this should return,
  // need to understand better when it's used
  //
  // maybe we should return previous dropTarget, or current dragItem's parent?
  const getFallbackDropTarget = () => {
    return {
      data: root,
      element: rootRef.current as HTMLElement,
    };
  };

  const useHoldHandler = useHold<DropTarget<Instance>>({
    isEqual: (a, b) => a.data.id === b.data.id,
    holdTimeThreshold: 1000,
    onHold: (dropTarget) => {
      const { getIsExpanded, setIsExpanded } = expandState;
      if (
        getIsExpandable(dropTarget.data) &&
        getIsExpanded(dropTarget.data) === false
      ) {
        setIsExpanded(dropTarget.data.id, true);
      }
    },
  });

  const dropHandlers = useDrop<Instance>({
    emulatePointerAlwaysInRootBounds: true,

    placementPadding: 0,

    elementToData: (element) => {
      const id = (element as HTMLElement).dataset.dropTargetId;
      const instance = id && findInstanceById(root, id);
      return instance || false;
    },

    swapDropTarget: (dropTarget) => {
      if (dragItem === undefined || dropTarget === undefined) {
        return getFallbackDropTarget();
      }

      if (dropTarget.data.id === root.id) {
        return dropTarget;
      }

      const path = getInstancePath(root, dropTarget.data.id);
      path.reverse();

      if (dropTarget.area === "top" || dropTarget.area === "bottom") {
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
        return getFallbackDropTarget();
      }

      const element =
        data &&
        rootRef.current?.querySelector(`[data-drop-target-id="${data.id}"]`);

      if (element == null) {
        return getFallbackDropTarget();
      }

      return { data, element };
    },

    onDropTargetChange: (dropTarget) => {
      useHoldHandler.setData(dropTarget);
      setDropTarget(dropTarget);
    },

    getValidChildren: (element) => {
      return Array.from(
        // @todo: if this works as expected, we need a selector that assumes less about the DOM structure
        element.querySelectorAll(":scope > div > [data-drop-target-id]")
      );
    },
  });

  const dragHandlers = useDrag<Instance>({
    elementToData: (element) => {
      const dragItemElement = element.closest("[data-drag-item-id]");
      if (!(dragItemElement instanceof HTMLElement)) {
        return false;
      }
      const id = dragItemElement.dataset.dragItemId;
      if (id === undefined || id === root.id) {
        return false;
      }
      return findInstanceById(root, id) || false;
    },
    onStart: ({ data }) => {
      setDragItem(data);
      dropHandlers.handleStart();
    },
    onMove: (point) => {
      dropHandlers.handleMove(point);
    },
    onEnd: ({ isCanceled }) => {
      if (dropTarget && dragItem && isCanceled === false) {
        onDragEnd({
          instanceId: dragItem.id,
          dropTarget: {
            instanceId: dropTarget.data.id,
            position: dropTarget.indexWithinChildren,
          },
        });
      }

      setDragItem(undefined);
      setDropTarget(undefined);
      dropHandlers.handleEnd();
      useHoldHandler.reset();
    },
  });

  return (
    <>
      <BaseTree
        {...props}
        {...expandState}
        onExpandTransitionEnd={dropHandlers.handleDomMutation}
        ref={(element) => {
          rootRef.current = element;
          dragHandlers.rootRef(element);
          dropHandlers.rootRef(element);
        }}
      />
      {dropTarget && <PlacementIndicator root={root} dropTarget={dropTarget} />}
    </>
  );
};

const PlacementIndicator = ({
  root,
  dropTarget,
}: {
  root: Instance;
  dropTarget: DropTarget<Instance>;
}) => {
  const depth = useMemo(() => {
    // We only need depth if we're rendering a line
    if (dropTarget.placement.type !== "inside-parent") {
      return getInstancePath(root, dropTarget.data.id).length;
    }
    return undefined;
  }, [dropTarget.data.id, dropTarget.placement.type, root]);

  if (depth !== undefined) {
    const { placement } = dropTarget;

    // @todo: fix magic numbers
    const shift = depth * 15 + 15 + 4;

    return createPortal(
      <Box
        style={{
          top: placement.y - 1,
          left: placement.x + shift,
          width: placement.length - shift,
          height: 2,
        }}
        css={{
          boxSizing: "content-box",
          position: "absolute",
          background: "#f531b3",
          pointerEvents: "none",
        }}
      >
        <Box
          css={{
            // @todo: fix magic numbers
            width: 8,
            height: 8,
            top: -3,
            left: -7,
            position: "absolute",
            border: "solid 2px #f531b3",
            borderRadius: "50%",
          }}
        />
      </Box>,
      document.body
    );
  }

  const { rect } = dropTarget;

  return createPortal(
    <Box
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
      css={{
        position: "absolute",
        pointerEvents: "none",
        outline: "2px solid #f531b3",
        borderRadius: 6,
      }}
    />,
    document.body
  );
};
