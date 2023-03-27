import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ListPositionIndicator } from "../list-position-indicator";
import { TreeNode, INDENT, TreeItemRenderProps } from "./tree-node";
import {
  useHold,
  useDrop,
  useDrag,
  useAutoScroll,
  useDragCursor,
  computeIndicatorPlacement,
} from "../primitives/dnd";
import { Box } from "../box";
import { useHorizontalShift } from "./horizontal-shift";
import {
  type ItemId,
  type ItemSelector,
  type ItemDropTarget,
  areItemSelectorsEqual,
  getElementByItemSelector,
  getItemSelectorFromElement,
} from "./item-utils";

export type TreeProps<Data extends { id: string }> = {
  root: Data;
  selectedItemSelector: undefined | ItemSelector;
  dragItemSelector: undefined | ItemSelector;
  dropTarget: undefined | ItemDropTarget;

  canLeaveParent: (itemId: ItemId) => boolean;
  canAcceptChild: (itemId: ItemId) => boolean;
  getItemChildren: (itemId: ItemId) => Data[];
  isItemHidden: (itemId: ItemId) => boolean;
  renderItem: (props: TreeItemRenderProps<Data>) => React.ReactNode;

  onSelect?: (itemSelector: ItemSelector) => void;
  onHover?: (itemSelector: undefined | ItemSelector) => void;
  animate?: boolean;
  onDropTargetChange: (dropTarget: ItemDropTarget) => void;
  onDragItemChange: (itemSelector: ItemSelector) => void;
  onDragEnd: (event: {
    itemSelector: ItemSelector;
    dropTarget: { itemSelector: ItemSelector; position: number | "end" };
  }) => void;
  onCancel: () => void;
};

const sharedDropOptions = {
  placementPadding: 0,
  getValidChildren: (element: Element) => {
    // NOTE:
    //   redefining children like this will screw up automatic childrenOrientation detection
    //   luckily we know the orientation and can define it manually below
    return Array.from(
      element.querySelectorAll(":scope > div > [data-drop-target-id]")
    );
  },
  childrenOrientation: { type: "vertical", reverse: false },
} as const;

export const Tree = <Data extends { id: string }>({
  root,
  selectedItemSelector,
  dragItemSelector,
  dropTarget,
  canLeaveParent,
  canAcceptChild,
  getItemChildren,
  isItemHidden,
  renderItem,
  onSelect,
  onHover,
  animate,
  onDropTargetChange,
  onDragItemChange,
  onDragEnd,
  onCancel,
}: TreeProps<Data>) => {
  const { getIsExpanded, setIsExpanded } = useExpandState({
    selectedItemSelector,
  });

  const rootRef = useRef<HTMLElement | null>(null);

  const placementIndicator = useMemo(() => {
    if (dropTarget === undefined) {
      return;
    }
    const element = getElementByItemSelector(
      rootRef.current ?? undefined,
      dropTarget.itemSelector
    );
    if (element === undefined) {
      return;
    }
    return computeIndicatorPlacement({
      placement: dropTarget.placement,
      element,
      ...sharedDropOptions,
    });
  }, [dropTarget]);

  const getDropTargetElement = useCallback(
    (id: string): HTMLElement | null | undefined =>
      rootRef.current?.querySelector(`[data-drop-target-id="${id}"]`),
    []
  );

  const [shiftedDropTarget, setHorizontalShift] = useHorizontalShift({
    dragItemSelector,
    dropTarget,
    placementIndicator,
    getIsExpanded,
    getItemChildren,
    isItemHidden,
    canAcceptChild,
  });

  const getFallbackDropTarget = () => {
    return {
      data: [root.id],
      element: getDropTargetElement(root.id) as HTMLElement,
      final: true,
    };
  };

  const useHoldHandler = useHold({
    data: dropTarget,
    isEqual: (a, b) => areItemSelectorsEqual(a?.itemSelector, b?.itemSelector),
    holdTimeThreshold: 600,
    onHold: (dropTarget) => {
      if (dropTarget === undefined) {
        return;
      }
      if (getIsExpanded(dropTarget.itemSelector) === false) {
        setIsExpanded(dropTarget.itemSelector, true);
      }
    },
  });

  const dropHandlers = useDrop<ItemSelector>({
    ...sharedDropOptions,

    emulatePointerAlwaysInRootBounds: true,

    elementToData: (element) => {
      return getItemSelectorFromElement(element);
    },

    swapDropTarget: (dropTarget) => {
      if (dragItemSelector === undefined || dropTarget === undefined) {
        return getFallbackDropTarget();
      }

      // drop target is the root
      if (dropTarget.data.length === 1) {
        return dropTarget;
      }

      const newDropItemSelector = dropTarget.data.slice();

      if (dropTarget.area === "top" || dropTarget.area === "bottom") {
        newDropItemSelector.shift();
      }

      // Don't allow to drop inside drag item or any of its children
      const [dragItemId] = dragItemSelector;
      const dragItemIndex = newDropItemSelector.indexOf(dragItemId);
      if (dragItemIndex !== -1) {
        newDropItemSelector.splice(0, dragItemIndex + 1);
      }

      // select closest droppable
      const ancestorIndex = newDropItemSelector.findIndex((itemId) =>
        canAcceptChild(itemId)
      );
      if (ancestorIndex === -1) {
        return getFallbackDropTarget();
      }
      newDropItemSelector.slice(ancestorIndex);

      const element = getElementByItemSelector(
        rootRef.current ?? undefined,
        newDropItemSelector
      );

      if (element === undefined) {
        return getFallbackDropTarget();
      }

      return { data: newDropItemSelector, element, final: true };
    },

    onDropTargetChange: (dropTarget) => {
      const itemDropTarget = {
        itemSelector: dropTarget.data,
        indexWithinChildren: dropTarget.indexWithinChildren,
        placement: dropTarget.placement,
      };
      onDropTargetChange(itemDropTarget);
    },
  });

  const dragHandlers = useDrag<ItemSelector>({
    shiftDistanceThreshold: INDENT,

    elementToData: (element) => {
      const dragItemSelector = getItemSelectorFromElement(element);
      // tree root is not draggable
      if (dragItemSelector.length === 1) {
        return false;
      }

      const [dragItemId] = dragItemSelector;
      if (canLeaveParent(dragItemId) === false) {
        return false;
      }

      return dragItemSelector;
    },
    onStart: ({ data: itemSelector }) => {
      onSelect?.(itemSelector);
      onDragItemChange(itemSelector);
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
      if (shiftedDropTarget && dragItemSelector && isCanceled === false) {
        onDragEnd({
          itemSelector: dragItemSelector,
          dropTarget: {
            itemSelector: shiftedDropTarget.itemSelector,
            position: shiftedDropTarget.position,
          },
        });
      } else {
        onCancel();
      }

      autoScrollHandlers.setEnabled(false);
      setHorizontalShift(0);
      dropHandlers.handleEnd({ isCanceled });
      useHoldHandler.reset();
    },
  });

  const autoScrollHandlers = useAutoScroll();

  useDragCursor(dragItemSelector !== undefined);

  const keyboardNavigation = useKeyboardNavigation({
    root,
    getItemChildren,
    isItemHidden,
    selectedItemSelector,
    getIsExpanded,
    setIsExpanded,
    onEsc: dragHandlers.cancelCurrentDrag,
  });

  return (
    <Box
      css={{
        width: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        flexBasis: 0,
        flexGrow: 1,
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
        onKeyDown={keyboardNavigation.handleKeyDown}
        onClick={keyboardNavigation.handleClick}
        onBlur={keyboardNavigation.handleBlur}
      >
        <TreeNode
          renderItem={renderItem}
          getItemChildren={getItemChildren}
          isItemHidden={isItemHidden}
          animate={animate}
          onSelect={onSelect}
          onMouseEnter={onHover}
          onMouseLeave={onHover}
          selectedItemSelector={selectedItemSelector}
          itemData={root}
          getIsExpanded={getIsExpanded}
          setIsExpanded={setIsExpanded}
          onExpandTransitionEnd={dropHandlers.handleDomMutation}
          dropTargetItemSelector={shiftedDropTarget?.itemSelector}
        />
      </Box>

      {shiftedDropTarget?.placement &&
        createPortal(
          <ListPositionIndicator
            x={shiftedDropTarget.placement.x}
            y={shiftedDropTarget.placement.y}
            length={shiftedDropTarget.placement.length}
            withNub
          />,
          document.body
        )}
    </Box>
  );
};

const useKeyboardNavigation = <Data extends { id: string }>({
  root,
  selectedItemSelector,
  getItemChildren,
  isItemHidden,
  getIsExpanded,
  setIsExpanded,
  onEsc,
}: {
  root: Data;
  selectedItemSelector: undefined | ItemSelector;
  getItemChildren: (itemId: ItemId) => Data[];
  isItemHidden: (itemId: ItemId) => boolean;
  getIsExpanded: (itemSelector: ItemSelector) => boolean;
  setIsExpanded: (itemSelector: ItemSelector, isExpanded: boolean) => void;
  onEsc: () => void;
}) => {
  const flatCurrentlyExpandedTree = useMemo(() => {
    const result: ItemSelector[] = [];
    const traverse = (itemSelector: ItemSelector) => {
      const [itemId] = itemSelector;
      if (isItemHidden(itemId) === false) {
        result.push(itemSelector);
      }
      if (getIsExpanded(itemSelector)) {
        for (const child of getItemChildren(itemId)) {
          traverse([child.id, ...itemSelector]);
        }
      }
    };
    traverse([root.id]);
    return result;
  }, [root, getIsExpanded, getItemChildren, isItemHidden]);

  const rootRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: ReactKeyboardEvent) => {
    // skip if nothing is selected in the tree
    if (selectedItemSelector === undefined) {
      return;
    }

    if (
      event.key === "ArrowRight" &&
      getIsExpanded(selectedItemSelector) === false
    ) {
      setIsExpanded(selectedItemSelector, true);
    }
    if (event.key === "ArrowLeft" && getIsExpanded(selectedItemSelector)) {
      setIsExpanded(selectedItemSelector, false);
    }
    if (event.key === " ") {
      setIsExpanded(selectedItemSelector, !getIsExpanded(selectedItemSelector));
      // prevent scrolling
      event.preventDefault();
    }
    if (event.key === "ArrowUp") {
      const index = flatCurrentlyExpandedTree.findIndex((itemSelector) =>
        areItemSelectorsEqual(itemSelector, selectedItemSelector)
      );
      if (index > 0) {
        setFocus(flatCurrentlyExpandedTree[index - 1], "changing");
        // prevent scrolling
        event.preventDefault();
      }
    }
    if (event.key === "ArrowDown") {
      const index = flatCurrentlyExpandedTree.findIndex((itemSelector) =>
        areItemSelectorsEqual(itemSelector, selectedItemSelector)
      );
      if (index < flatCurrentlyExpandedTree.length - 1) {
        setFocus(flatCurrentlyExpandedTree[index + 1], "changing");
        // prevent scrolling
        event.preventDefault();
      }
    }
    if (event.key === "Escape") {
      onEsc();
    }
  };

  const setFocus = useCallback(
    (itemSelector: ItemSelector, reason: "restoring" | "changing") => {
      const [itemId] = itemSelector;
      const itemButton = getElementByItemSelector(
        rootRef.current ?? undefined,
        itemSelector
      )?.querySelector(`[data-item-button-id="${itemId}"]`);
      if (itemButton instanceof HTMLElement) {
        itemButton.focus({ preventScroll: reason === "restoring" });
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
      selectedItemSelector !== undefined
    ) {
      setFocus(selectedItemSelector, "restoring");
    }
  }, [root, rootRef, selectedItemSelector, setFocus]);

  // onBlur doesn't fire when the activeElement is removed from the DOM
  useEffect(() => {
    const haveFocus =
      rootRef.current?.contains(document.activeElement) === true;
    hadFocus.current = haveFocus;
  });

  return {
    rootRef,
    handleKeyDown,
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
      if (selectedItemSelector !== undefined) {
        setFocus(selectedItemSelector, "restoring");
      }
    },
    handleBlur() {
      hadFocus.current = false;
    },
  };
};

const useExpandState = ({
  selectedItemSelector,
}: {
  selectedItemSelector: undefined | ItemSelector;
}) => {
  const [record, setRecord] = useState<Record<string, boolean>>({});

  // whenever selected instance is changed
  // all its parents should be automatically expanded
  const prevSelectedItemSelector = useRef(selectedItemSelector);
  useEffect(() => {
    if (
      areItemSelectorsEqual(
        selectedItemSelector,
        prevSelectedItemSelector.current
      )
    ) {
      return;
    }
    prevSelectedItemSelector.current = selectedItemSelector;
    if (selectedItemSelector === undefined) {
      return;
    }
    setRecord((record) => {
      const newRecord = { ...record };
      let expanded = 0;
      // do not expand the selected instance itself, start with parent
      for (let index = 1; index < selectedItemSelector.length; index += 1) {
        const key = selectedItemSelector.slice(index).join();
        if (newRecord[key] !== true) {
          newRecord[key] = true;
          expanded += 1;
        }
      }
      // prevent rerender if nothing new is expanded
      return expanded === 0 ? record : newRecord;
    });
  }, [selectedItemSelector]);

  const getIsExpanded = useCallback(
    (itemSelector: ItemSelector) => {
      // root is always expanded
      if (itemSelector.length === 1) {
        return true;
      }
      return record[itemSelector.join()] === true;
    },
    [record]
  );

  const setIsExpanded = useCallback(
    (itemSelector: ItemSelector, expanded: boolean) => {
      setRecord((record) => ({ ...record, [itemSelector.join()]: expanded }));
    },
    []
  );

  return { getIsExpanded, setIsExpanded };
};
