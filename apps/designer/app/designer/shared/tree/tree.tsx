import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  type Instance,
  components,
  useSubscribe,
} from "@webstudio-is/react-sdk";
import {
  type DropTarget,
  type Placement,
  useDrag,
  useDrop,
  useHold,
  useAutoScroll,
  useDragCursor,
  Box,
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
import { PlacementIndicator } from "./placement-indicator";
import { useHotkeys } from "react-hotkeys-hook";

type TreeProps = {
  root: Instance;
  selectedInstanceId?: Instance["id"];
  onSelect?: (instanceId: Instance["id"]) => void;
  animate?: boolean;
  onDragEnd: (event: {
    instanceId: Instance["id"];
    dropTarget: { instanceId: Instance["id"]; position: number | "end" };
  }) => void;
  onDelete: (instanceId: Instance["id"]) => void;
};

export const Tree = ({
  root,
  selectedInstanceId,
  onSelect,
  animate,
  onDragEnd,
  onDelete,
}: TreeProps) => {
  const { getIsExpanded, setIsExpanded } = useExpandState({
    root,
    selectedInstanceId,
  });

  const rootRef = useRef<HTMLElement | null>(null);

  const [dragItem, setDragItem] = useState<Instance>();
  const [dropTarget, setDropTarget] = useState<DropTarget<Instance>>();

  const getDropTargetElement = useCallback(
    (id: Instance["id"]): HTMLElement | null | undefined =>
      rootRef.current?.querySelector(`[data-drop-target-id="${id}"]`),
    []
  );

  const [shiftedDropTarget, setHorizontalShift] = useHorizontalShift({
    dragItem,
    dropTarget,
    root,
    getIsExpanded,
  });

  const getFallbackDropTarget = () => {
    return {
      data: root,
      element: getDropTargetElement(root.id) as HTMLElement,
      final: true,
    };
  };

  const useHoldHandler = useHold<DropTarget<Instance>>({
    isEqual: (a, b) => a.data.id === b.data.id,
    holdTimeThreshold: 600,
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

      const element = getDropTargetElement(data.id);

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
      onSelect?.(data.id);
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
      if (shiftedDropTarget && dragItem && isCanceled === false) {
        onDragEnd({
          instanceId: dragItem.id,
          dropTarget: {
            instanceId: shiftedDropTarget.instance.id,
            position: shiftedDropTarget.position,
          },
        });
      }

      autoScrollHandlers.setEnabled(false);
      setHorizontalShift(0);
      setDragItem(undefined);
      setDropTarget(undefined);
      dropHandlers.handleEnd({ isCanceled });
      useHoldHandler.reset();
    },
  });

  useSubscribe("cancelCurrentDrag", () => {
    dragHandlers.cancelCurrentDrag();
  });

  const autoScrollHandlers = useAutoScroll();

  useDragCursor(dragItem !== undefined);

  const keyboardNavigation = useKeyboardNavigation({
    root,
    selectedInstanceId,
    getIsExpanded,
    setIsExpanded,
    onDelete,
  });

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
      ref={(element) => {
        rootRef.current = element;
        autoScrollHandlers.targetRef(element);
        dragHandlers.rootRef(element);
        dropHandlers.rootRef(element);
      }}
      onScroll={dropHandlers.handleScroll}
    >
      <Box
        ref={keyboardNavigation.rootRef}
        onClick={keyboardNavigation.handleClick}
        onBlur={keyboardNavigation.handleBlur}
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
        />
      </Box>
      {shiftedDropTarget &&
        createPortal(
          <PlacementIndicator
            dropTarget={shiftedDropTarget}
            getDropTargetElement={getDropTargetElement}
          />,
          document.body
        )}
    </Box>
  );
};

const useKeyboardNavigation = ({
  root,
  selectedInstanceId,
  getIsExpanded,
  setIsExpanded,
  onDelete,
}: {
  root: Instance;
  selectedInstanceId: Instance["id"] | undefined;
  getIsExpanded: (instance: Instance) => boolean;
  setIsExpanded: (instance: Instance, isExpanded: boolean) => void;
  onDelete: (instanceId: Instance["id"]) => void;
}) => {
  const selectedInstance = useMemo(() => {
    if (selectedInstanceId === undefined) {
      return undefined;
    }
    return findInstanceById(root, selectedInstanceId);
  }, [root, selectedInstanceId]);

  const flatCurrentlyExpandedTree = useMemo(() => {
    const result = [] as Instance["id"][];
    const traverse = (instance: Instance | string) => {
      if (typeof instance === "string") {
        return;
      }
      result.push(instance.id);
      if (getIsExpanded(instance)) {
        instance.children.forEach(traverse);
      }
    };
    traverse(root);
    return result;
  }, [root, getIsExpanded]);

  const rootRef = useHotkeys(
    "up,down,right,left,space,backspace,delete",
    (event, { shortcut }) => {
      if (selectedInstance === undefined) {
        return;
      }
      if (shortcut === "right" && getIsExpanded(selectedInstance) === false) {
        setIsExpanded(selectedInstance, true);
      }
      if (shortcut === "left" && getIsExpanded(selectedInstance)) {
        setIsExpanded(selectedInstance, false);
      }
      if (shortcut === "space") {
        setIsExpanded(selectedInstance, !getIsExpanded(selectedInstance));
      }
      if (shortcut === "up") {
        const index = flatCurrentlyExpandedTree.indexOf(selectedInstance.id);
        if (index > 0) {
          setFocus(flatCurrentlyExpandedTree[index - 1]);
          event.preventDefault(); // prevent scrolling
        }
      }
      if (shortcut === "down") {
        const index = flatCurrentlyExpandedTree.indexOf(selectedInstance.id);
        if (index < flatCurrentlyExpandedTree.length - 1) {
          setFocus(flatCurrentlyExpandedTree[index + 1]);
          event.preventDefault(); // prevent scrolling
        }
      }
      if (shortcut === "backspace" || shortcut === "delete") {
        onDelete(selectedInstance.id);
      }
    },
    [
      selectedInstance,
      flatCurrentlyExpandedTree,
      getIsExpanded,
      setIsExpanded,
      onDelete,
    ]
  );

  const setFocus = useCallback(
    (instanceId: Instance["id"]) => {
      const itemButton = rootRef.current?.querySelector(
        `[data-item-button-id="${instanceId}"]`
      );
      if (itemButton instanceof HTMLElement) {
        itemButton.focus();
      }
    },
    [rootRef]
  );

  const hadFocus = useRef(false);
  const prevRoot = useRef(root);
  useEffect(() => {
    const haveFocus =
      rootRef.current?.contains(document.activeElement) === true;

    const isRootChanged = prevRoot.current !== root;
    prevRoot.current = root;

    // If we've lost focus due to a root update, we want to get it back.
    // This can happen when we delete an item or on drag-end.
    if (
      isRootChanged &&
      haveFocus === false &&
      hadFocus.current === true &&
      selectedInstanceId !== undefined
    ) {
      setFocus(selectedInstanceId);
    }
  }, [root, rootRef, selectedInstanceId, setFocus]);

  // onBlur doesn't fire when the activeElement is removed from the DOM
  useEffect(() => {
    const haveFocus =
      rootRef.current?.contains(document.activeElement) === true;
    hadFocus.current = haveFocus;
  });

  return {
    rootRef(element: HTMLElement | null) {
      rootRef.current = element;
    },
    handleClick(event: React.MouseEvent<Element>) {
      // When clicking on an item button make sure it gets focused.
      // (see https://zellwk.com/blog/inconsistent-button-behavior/)
      const itemButton = (event.target as HTMLElement).closest(
        "[data-item-button-id]"
      );
      if (itemButton instanceof HTMLElement) {
        itemButton.focus();
        return;
      }

      // When clicking anywhere else in the tree,
      // make sure the selected item doesn't loose focus.
      if (selectedInstanceId !== undefined) {
        setFocus(selectedInstanceId);
      }
    },
    handleBlur() {
      hadFocus.current = false;
    },
  };
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
  const prevRoot = useRef(root);
  useEffect(() => {
    if (
      selectedInstanceId === prevSelectedInstanceId.current &&
      prevRoot.current === root
    ) {
      return;
    }
    prevSelectedInstanceId.current = selectedInstanceId;
    prevRoot.current = root;
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
      // root is always expanded
      if (instance.id === root.id) {
        return true;
      }

      return getIsExpandable(instance) && record[instance.id] === true;
    },
    [record, root]
  );

  const setIsExpanded = useCallback((instance: Instance, expanded: boolean) => {
    setRecord((record) => ({ ...record, [instance.id]: expanded }));
  }, []);

  return { getIsExpanded, setIsExpanded };
};

export type ShiftedDropTarget = {
  instance: Instance;
  position: number | "end";
  placement?: Placement;
};

export const useHorizontalShift = ({
  dragItem,
  dropTarget,
  root,
  getIsExpanded,
}: {
  dragItem: Instance | undefined;
  dropTarget: DropTarget<Instance> | undefined;
  root: Instance;
  getIsExpanded: (instance: Instance) => boolean;
}) => {
  const [horizontalShift, setHorizontalShift] = useState(0);

  const dragItemDepth = useMemo(
    () => dragItem && getInstancePath(root, dragItem.id).length - 1,
    [dragItem, root]
  );

  // Here we want to allow user to shift placement line horizontally
  // but only if that corresponds to a meaningful position in the tree
  const shiftedDropTarget = useMemo<ShiftedDropTarget | undefined>(() => {
    if (
      dropTarget === undefined ||
      dragItemDepth === undefined ||
      dragItem === undefined
    ) {
      return undefined;
    }

    const { data, placement, indexWithinChildren } = dropTarget;

    const shiftPlacement = (depth: number) => {
      const shift = getPlacementIndicatorAlignment(depth);
      return {
        ...placement,
        x: placement.x + shift,
        length: placement.length - shift,
      };
    };

    // Placement type “inside-parent” means that useDrop() didn’t find any children.
    // In this case the placement line coordinates are meaningless in the context of the tree.
    // We're dropping the placement and not performing any shifting.
    if (placement.type === "inside-parent") {
      return { instance: data, position: "end" };
    }

    const dropTargetPath = getInstancePathWithPositions(root, data.id);
    dropTargetPath.reverse();

    const currentDepth = dropTargetPath.length;
    const desiredDepth = dragItemDepth + horizontalShift;

    const withoutShift = {
      instance: data,
      position: indexWithinChildren,
      placement: shiftPlacement(currentDepth),
    } as const;

    const isDragItem = (instance: Instance | undefined | string) =>
      typeof instance === "object" && instance.id === dragItem.id;

    if (desiredDepth < currentDepth) {
      let shifted = 0;
      let newParent = data;
      let newPosition = indexWithinChildren;

      const isAtTheBottom = (parent: Instance, index: number) => {
        // There's a special case when the placement line is above the drag item.
        // For reparenting above and below the drag item means the same thing.
        const indexCorrected = isDragItem(parent.children[index])
          ? index + 1
          : index;
        return indexCorrected === parent.children.length;
      };

      let potentialNewParent = dropTargetPath[shifted + 1];

      while (
        isAtTheBottom(newParent, newPosition) &&
        typeof potentialNewParent === "object" &&
        components[potentialNewParent.instance.component].canAcceptChild() &&
        shifted < currentDepth - desiredDepth
      ) {
        shifted++;
        newPosition = dropTargetPath[shifted - 1].position + 1;
        newParent = potentialNewParent.instance;
        potentialNewParent = dropTargetPath[shifted + 1];
      }

      if (shifted === 0) {
        return withoutShift;
      }

      return {
        instance: newParent,
        position: newPosition,
        placement: shiftPlacement(currentDepth - shifted),
      };
    }

    if (desiredDepth > currentDepth) {
      let shifted = 0;
      let newParent = data;

      // There's a special case when the placement line is below the drag item.
      // For reparenting above and below the drag item means the same thing.
      const getChildAbove = (
        parent: Instance,
        index: number
      ): string | undefined | Instance =>
        isDragItem(parent.children[index - 1])
          ? parent.children[index - 2]
          : parent.children[index - 1];

      let potentialNewParent = getChildAbove(data, indexWithinChildren);

      while (
        typeof potentialNewParent === "object" &&
        getIsExpanded(potentialNewParent) &&
        components[potentialNewParent.component].canAcceptChild() &&
        shifted < desiredDepth - currentDepth
      ) {
        newParent = potentialNewParent;
        potentialNewParent = getChildAbove(
          newParent,
          newParent.children.length
        );
        shifted++;
      }

      if (shifted === 0) {
        return withoutShift;
      }

      return {
        instance: newParent,
        position: "end",
        placement: shiftPlacement(currentDepth + shifted),
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

  return [shiftedDropTarget, setHorizontalShift] as const;
};
