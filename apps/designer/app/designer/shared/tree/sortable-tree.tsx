import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  type Instance,
  components,
  useSubscribe,
} from "@webstudio-is/react-sdk";
import {
  type DropTarget,
  type Rect,
  useDrag,
  useDrop,
  useHold,
  Box,
  useAutoScroll,
} from "@webstudio-is/design-system";
import {
  findInstanceById,
  getInstancePath,
  getInstancePathWithPositions,
} from "~/shared/tree-utils";
import { createPortal } from "react-dom";
import {
  TreeNode,
  getIsExpandable,
  getPlacementIndicatorAlignment,
  INDENT,
} from "./tree-node";
import { CSSProperties } from "@stitches/react";
import {
  PlacementIndicatorLine,
  PlacementIndicatorOutline,
} from "./placement-indicator";

type TreeProps = {
  root: Instance;
  selectedInstanceId?: Instance["id"];
  onSelect?: (instance: Instance) => void;
  animate?: boolean;
};

export const SortableTree = ({
  root,
  selectedInstanceId,
  onSelect,
  animate,
  onDragEnd,
}: TreeProps & {
  onDragEnd: (event: {
    instanceId: Instance["id"];
    dropTarget: { instanceId: Instance["id"]; position: number | "end" };
  }) => void;
  height?: CSSProperties["height"];
}) => {
  const { getIsExpanded, setIsExpanded } = useExpandState({
    root,
    selectedInstanceId,
  });

  const rootNodeRef = useRef<HTMLElement | null>(null);

  const [dragItem, setDragItem] = useState<Instance>();
  const [dropTarget, setDropTarget] = useState<DropTarget<Instance>>();

  const [horizontalShift, setHorizontalShift] = useState(0);

  const dragItemDepth = useMemo(
    () => dragItem && getInstancePath(root, dragItem.id).length - 1,
    [dragItem, root]
  );

  // Here we want to allow user to shift placement line horizontally
  // but only if that corresponds to a meaningful position in the tree
  const finalDropTarget = useMemo<
    | {
        instance: Instance;
        position: number | "end";
        placement:
          | { type: "rect"; rect: Rect }
          | { type: "line"; line: DropTarget<unknown>["placement"] };
      }
    | undefined
  >(() => {
    if (
      dropTarget === undefined ||
      dragItemDepth === undefined ||
      dragItem === undefined
    ) {
      return undefined;
    }

    const { data, placement, rect, indexWithinChildren } = dropTarget;

    // Placement type “inside-parent” means that useDrop didn’t find any children,
    // and the “placement” corresponds to a line near an edge of the parent.
    // This means the drop target is empty or collapsed.
    // In this case, we want to show a rect instead of a line.
    // Also, we don’t want to apply shift, as there’s no line to shift.
    if (placement.type === "inside-parent") {
      return {
        instance: data,
        position: "end",
        placement: { type: "rect", rect: rect },
      };
    }

    const dropTargetPath = getInstancePathWithPositions(root, data.id);
    dropTargetPath.reverse();

    const currentDepth = dropTargetPath.length;
    const desiredDepth = dragItemDepth + horizontalShift;

    const shiftLine = (depth: number) => {
      const shift = getPlacementIndicatorAlignment(depth);
      return {
        ...placement,
        x: placement.x + shift,
        length: placement.length - shift,
      };
    };

    const withoutShift = {
      instance: data,
      position: indexWithinChildren,
      placement: { type: "line", line: shiftLine(currentDepth) },
    } as const;

    if (desiredDepth < currentDepth) {
      // Unless we're currently at the bottom of drop target's children,
      // decreasing depth will not correspond to a new meaningful position
      if (indexWithinChildren !== data.children.length) {
        // But there's a special case when the index is `last - 1` and the last child is the drag item.
        // When drag item is removed from its current position, `last - 1` will become `last`.
        if (indexWithinChildren !== data.children.length - 1) {
          return withoutShift;
        }
        const lastChild = data.children[data.children.length - 1];
        if (typeof lastChild !== "object" || lastChild.id !== dragItem.id) {
          return withoutShift;
        }
      }

      const difference = Math.min(
        dropTargetPath.length - 1,
        currentDepth - desiredDepth
      );

      // Ideally we should check canAcceptChildren on the new target
      // but we assume that because it already has a child, it can accept more.

      return {
        instance: dropTargetPath[difference].instance,
        position: dropTargetPath[difference - 1].position + 1,
        placement: {
          type: "line",
          line: shiftLine(currentDepth - difference),
        },
      };
    }

    if (desiredDepth > currentDepth) {
      let shifted = 0;
      let newParent = data;
      let potentialNewParent = data.children[indexWithinChildren - 1];

      while (
        potentialNewParent !== undefined &&
        typeof potentialNewParent !== "string" &&
        getIsExpanded(potentialNewParent) &&
        components[potentialNewParent.component].canAcceptChild() &&
        shifted < desiredDepth - currentDepth
      ) {
        newParent = potentialNewParent;
        potentialNewParent = newParent.children[newParent.children.length - 1];
        shifted++;
      }

      if (shifted === 0) {
        return withoutShift;
      }

      return {
        instance: newParent,
        position: "end",
        placement: { type: "line", line: shiftLine(currentDepth + shifted) },
      };
    }

    return withoutShift;
  }, [
    dragItem,
    dragItemDepth,
    dropTarget,
    root,
    horizontalShift,
    getIsExpanded,
  ]);

  const getFallbackDropTarget = () => {
    return {
      data: root,
      element: rootNodeRef.current as HTMLElement,
      final: true,
    };
  };

  const useHoldHandler = useHold<DropTarget<Instance>>({
    isEqual: (a, b) => a.data.id === b.data.id,
    holdTimeThreshold: 1000,
    onHold: (dropTarget) => {
      if (
        getIsExpandable(dropTarget.data) &&
        getIsExpanded(dropTarget.data) === false
      ) {
        setIsExpanded(dropTarget.data, true);
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

      if (data === undefined) {
        return getFallbackDropTarget();
      }

      const element = rootNodeRef.current?.querySelector(
        `[data-drop-target-id="${data.id}"]`
      );

      if (element == null) {
        return getFallbackDropTarget();
      }

      return { data, element, final: true };
    },

    onDropTargetChange: (dropTarget) => {
      useHoldHandler.setData(dropTarget);
      setDropTarget(dropTarget);
    },

    getValidChildren: (element) => {
      return Array.from(
        element.querySelectorAll(":scope > div > [data-drop-target-id]")
      );
    },
  });

  const dragHandlers = useDrag<Instance>({
    shiftDistanceThreshold: INDENT,

    elementToData: (element) => {
      const dragItemElement = element.closest("[data-drag-item-id]");
      if (!(dragItemElement instanceof HTMLElement)) {
        return false;
      }
      const id = dragItemElement.dataset.dragItemId;
      if (id === undefined || id === root.id) {
        return false;
      }

      const instance = findInstanceById(root, id);

      if (instance === undefined) {
        return false;
      }

      if (components[instance.component].isInlineOnly) {
        return false;
      }

      return instance;
    },
    onStart: ({ data }) => {
      onSelect?.(data);
      setDragItem(data);
      dropHandlers.handleStart();
      autoScrollHandlers.setEnabled(true);
    },
    onMove: (point) => {
      dropHandlers.handleMove(point);
      autoScrollHandlers.handleMove(point);
    },
    onShiftChange: ({ shifts }) => {
      setHorizontalShift(shifts);
    },
    onEnd: ({ isCanceled }) => {
      if (finalDropTarget && dragItem && isCanceled === false) {
        onDragEnd({
          instanceId: dragItem.id,
          dropTarget: {
            instanceId: finalDropTarget.instance.id,
            position: finalDropTarget.position,
          },
        });
      }

      autoScrollHandlers.setEnabled(false);
      setHorizontalShift(0);
      setDragItem(undefined);
      setDropTarget(undefined);
      dropHandlers.handleEnd();
      useHoldHandler.reset();
    },
  });

  useSubscribe("cancelCurrentDrag", () => {
    dragHandlers.cancelCurrentDrag();
  });

  const autoScrollHandlers = useAutoScroll();

  return (
    <Box
      css={{
        width: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        flexBasis: 0,
        flexGrow: 1,
        pt: 2,
        pb: 2,
      }}
      ref={autoScrollHandlers.targetRef}
      onScroll={dropHandlers.handleScroll}
    >
      <TreeNode
        animate={animate}
        onSelect={onSelect}
        selectedInstanceId={selectedInstanceId}
        instance={root}
        level={0}
        getIsExpanded={getIsExpanded}
        setIsExpanded={setIsExpanded}
        onExpandTransitionEnd={dropHandlers.handleDomMutation}
        disableHoverStates={dragItem !== undefined}
        ref={(element) => {
          rootNodeRef.current = element;
          dragHandlers.rootRef(element);
          dropHandlers.rootRef(element);
        }}
      />
      {finalDropTarget &&
        createPortal(
          finalDropTarget.placement.type === "rect" ? (
            <PlacementIndicatorOutline rect={finalDropTarget.placement.rect} />
          ) : (
            <PlacementIndicatorLine line={finalDropTarget.placement.line} />
          ),
          document.body
        )}
    </Box>
  );
};

const useExpandState = ({
  selectedInstanceId,
  root,
}: {
  root: Instance;
  selectedInstanceId?: Instance["id"];
}) => {
  const [record, setRecord] = useState<Record<Instance["id"], boolean>>({});

  // We want to automatically expand all parents of the selected instance whenever it changes
  const prevSelectedInstanceId = useRef(selectedInstanceId);
  useEffect(() => {
    if (selectedInstanceId === prevSelectedInstanceId.current) {
      return;
    }
    prevSelectedInstanceId.current = selectedInstanceId;
    if (selectedInstanceId === undefined) {
      return;
    }
    const path = getInstancePath(root, selectedInstanceId).map(
      (instance) => instance.id
    );
    // Don't want to expand the selected instance itself
    path.pop();
    const toExpand = path.filter((id) => record[id] !== true);
    if (toExpand.length === 0) {
      return;
    }
    setRecord((record) => {
      const newRecord = { ...record };
      for (const id of toExpand) {
        newRecord[id] = true;
      }
      return newRecord;
    });
  }, [record, root, selectedInstanceId]);

  const getIsExpanded = useCallback(
    (instance: Instance) => {
      return getIsExpandable(instance) && record[instance.id] === true;
    },
    [record]
  );

  const setIsExpanded = useCallback((instance: Instance, expanded: boolean) => {
    setRecord((record) => ({ ...record, [instance.id]: expanded }));
  }, []);

  return { getIsExpanded, setIsExpanded };
};
