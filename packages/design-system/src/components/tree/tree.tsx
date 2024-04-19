import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ListPositionIndicator } from "../list-position-indicator";
import {
  TreeNode,
  INDENT,
  type TreeItemRenderProps,
  showNestingLineVars,
  type TreeNodeProps,
} from "./tree-node";
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
import { ScrollArea } from "../scroll-area";
import { theme } from "../..";

export type TreeProps<Data extends { id: string }> = {
  root: Data;
  selectedItemSelector: undefined | ItemSelector;
  dragItemSelector: undefined | ItemSelector;
  dropTarget: undefined | ItemDropTarget;

  canLeaveParent: (itemSelector: ItemSelector) => boolean;
  findClosestDroppableIndex: (itemSelector: ItemSelector) => number;
  getItemChildren: (itemSelector: ItemSelector) => Data[];
  getItemProps?: TreeNodeProps<Data>["getItemProps"];
  isItemHidden: (itemSelector: ItemSelector) => boolean;
  renderItem: (props: TreeItemRenderProps<Data>) => React.ReactNode;

  onSelect?: (itemSelector: ItemSelector) => void;
  onHover?: (itemSelector: undefined | ItemSelector) => void;
  onDropTargetChange: (dropTarget: undefined | ItemDropTarget) => void;
  onDragItemChange: (itemSelector: ItemSelector) => void;
  onDragEnd: (event: {
    itemSelector: ItemSelector;
    dropTarget: { itemSelector: ItemSelector; position: number | "end" };
  }) => void;
  onCancel: () => void;
  editingItemId: ItemId | undefined;
};

const sharedDropOptions = {
  placementPadding: 0,
  getValidChildren: (element: Element) => {
    // NOTE:
    //   redefining children like this will screw up automatic childrenOrientation detection
    //   luckily we know the orientation and can define it manually below
    return Array.from(
      element.querySelectorAll(":scope > [data-drop-target-id]")
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
  findClosestDroppableIndex,
  getItemChildren,
  getItemProps,
  isItemHidden,
  renderItem,
  onSelect,
  onHover,
  onDropTargetChange,
  onDragItemChange,
  onDragEnd,
  onCancel,
  editingItemId,
}: TreeProps<Data>) => {
  const { getIsExpanded, setIsExpanded } = useExpandState({
    selectedItemSelector,
    getItemChildren,
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

  const canAcceptChild = useCallback(
    (itemSelector: ItemSelector) => {
      const ancestorIndex = findClosestDroppableIndex(itemSelector);
      return ancestorIndex === 0;
    },
    [findClosestDroppableIndex]
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

    elementToData: (element) => {
      // We want to make sure edge detection is calculated relative
      // to the element with the data-drop-target-id attribute.
      // So, unless it has the attribute,
      // we return `false` to make useDrop go up the tree.
      if (element.getAttribute("data-drop-target-id") === null) {
        return false;
      }
      return getItemSelectorFromElement(element);
    },

    swapDropTarget: (dropTarget) => {
      if (dragItemSelector === undefined || dropTarget === undefined) {
        return;
      }

      let newDropItemSelector = dropTarget.data.slice();

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
      const ancestorIndex = findClosestDroppableIndex(newDropItemSelector);
      if (ancestorIndex === -1) {
        return;
      }
      newDropItemSelector = newDropItemSelector.slice(ancestorIndex);

      const element = getElementByItemSelector(
        rootRef.current ?? undefined,
        newDropItemSelector
      );

      if (element === undefined) {
        return;
      }

      return { data: newDropItemSelector, element, final: true };
    },

    onDropTargetChange: (dropTarget) => {
      if (dropTarget === undefined) {
        onDropTargetChange(undefined);
      } else {
        const itemDropTarget = {
          itemSelector: dropTarget.data,
          indexWithinChildren: dropTarget.indexWithinChildren,
          placement: dropTarget.placement,
        };
        onDropTargetChange(itemDropTarget);
      }
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

      if (canLeaveParent(dragItemSelector) === false) {
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
    editingItemId,
  });

  return (
    <ScrollArea
      // TODO allow resizing of the panel instead.
      direction="both"
      css={{
        width: "100%",
        overflow: "hidden",
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
        onBlur={keyboardNavigation.handleBlur}
        onKeyDown={keyboardNavigation.handleKeyDown}
        onClick={keyboardNavigation.handleClick}
        css={{
          // To not intersect last element with the scroll
          marginBottom: theme.spacing[7],
          "&:hover": showNestingLineVars(),
        }}
      >
        <TreeNode
          renderItem={renderItem}
          getItemChildren={getItemChildren}
          getItemProps={getItemProps}
          isItemHidden={isItemHidden}
          onSelect={onSelect}
          onHover={onHover}
          selectedItemSelector={selectedItemSelector}
          itemData={root}
          getIsExpanded={getIsExpanded}
          setIsExpanded={(itemSelector, value, all) => {
            setIsExpanded(itemSelector, value, all);
            dropHandlers.handleDomMutation();
          }}
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
    </ScrollArea>
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
  editingItemId,
}: {
  root: Data;
  selectedItemSelector: undefined | ItemSelector;
  getItemChildren: (itemSelector: ItemSelector) => Data[];
  isItemHidden: (itemSelector: ItemSelector) => boolean;
  getIsExpanded: (itemSelector: ItemSelector) => boolean;
  setIsExpanded: (
    itemSelector: ItemSelector,
    value: boolean,
    all?: boolean
  ) => void;
  onEsc: () => void;
  editingItemId: ItemId | undefined;
}) => {
  const flatCurrentlyExpandedTree = useMemo(() => {
    const result: ItemSelector[] = [];
    const traverse = (itemSelector: ItemSelector) => {
      if (isItemHidden(itemSelector) === false) {
        result.push(itemSelector);
      }
      if (getIsExpanded(itemSelector)) {
        for (const child of getItemChildren(itemSelector)) {
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

    if (editingItemId !== undefined) {
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
      setIsExpanded(
        selectedItemSelector,
        getIsExpanded(selectedItemSelector) === false
      );
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
      if (editingItemId) {
        return;
      }

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

const useExpandState = <Data extends { id: string }>({
  selectedItemSelector,
  getItemChildren,
}: {
  selectedItemSelector: undefined | ItemSelector;
  getItemChildren: (itemSelector: ItemSelector) => Data[];
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
    (itemSelector: ItemSelector, value: boolean, all?: boolean) => {
      setRecord((record) => {
        if (all) {
          const newRecord = { ...record };
          const addChildren = (parentSelector: string[]) => {
            for (const child of getItemChildren(parentSelector)) {
              const itemSelector = [child.id, ...parentSelector];
              newRecord[itemSelector.join()] = value;
              addChildren(itemSelector);
            }
          };
          newRecord[itemSelector.join()] = value;
          addChildren(itemSelector);
          return newRecord;
        }
        return { ...record, [itemSelector.join()]: value };
      });
    },
    [getItemChildren]
  );

  return { getIsExpanded, setIsExpanded };
};
