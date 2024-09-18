import type { ReactNode } from "react";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { FocusScope, useFocusManager } from "@react-aria/focus";
import { ListPositionIndicator } from "../../list-position-indicator";
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
} from "../../primitives/dnd";
import { Box } from "../../box";
import { useHorizontalShift } from "./horizontal-shift";
import {
  type ItemId,
  type ItemSelector,
  type ItemDropTarget,
  areItemSelectorsEqual,
  getElementByItemSelector,
  getItemSelectorFromElement,
} from "./item-utils";
import { ScrollArea } from "../../scroll-area";
import { theme } from "../../..";

const KeyboardNavigation = ({
  editingItemId,
  onExpandedChange,
  children,
}: {
  editingItemId: ItemId | undefined;
  onExpandedChange: (expanded?: boolean) => void;
  children: ReactNode;
}) => {
  const focusManager = useFocusManager();
  return (
    <div
      onKeyDown={(event) => {
        if (event.defaultPrevented) {
          return;
        }
        // prevent navigating while editing nodes
        if (editingItemId) {
          return;
        }
        if (event.key === "ArrowUp") {
          focusManager?.focusPrevious({
            accept: (node) => node.hasAttribute("data-item-button-id"),
          });
          // prevent scrolling
          event.preventDefault();
        }
        if (event.key === "ArrowDown") {
          focusManager?.focusNext({
            accept: (node) => node.hasAttribute("data-item-button-id"),
          });
          // prevent scrolling
          event.preventDefault();
        }
        if (event.key === "ArrowLeft") {
          onExpandedChange(false);
          //
        }
        if (event.key === "ArrowRight") {
          onExpandedChange(true);
        }
        if (event.key === " ") {
          onExpandedChange();
          // prevent scrolling
          event.preventDefault();
        }
      }}
    >
      {children}
    </div>
  );
};

export type TreeProps<Data extends { id: string }> = {
  root: Data;
  selectedItemSelector: undefined | ItemSelector;
  highlightedItemSelector?: ItemSelector;
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
  highlightedItemSelector,
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
      if (element.hasAttribute("contenteditable")) {
        return false;
      }
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

  return (
    <ScrollArea
      // TODO allow resizing of the panel instead.
      direction="both"
      css={{
        width: "100%",
        overflow: "hidden",
        flexBasis: 0,
        flexGrow: 1,
        "&:hover": showNestingLineVars(),
      }}
      ref={(element) => {
        rootRef.current = element;
        autoScrollHandlers.targetRef(element);
        dragHandlers.rootRef(element);
        dropHandlers.rootRef(element);
      }}
      onScroll={dropHandlers.handleScroll}
    >
      <FocusScope>
        <KeyboardNavigation
          editingItemId={editingItemId}
          onExpandedChange={(expanded) => {
            if (selectedItemSelector) {
              expanded ??= getIsExpanded(selectedItemSelector) === false;
              setIsExpanded(selectedItemSelector, expanded);
            }
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
            highlightedItemSelector={highlightedItemSelector}
            itemData={root}
            getIsExpanded={getIsExpanded}
            setIsExpanded={(itemSelector, value, all) => {
              setIsExpanded(itemSelector, value, all);
              dropHandlers.handleDomMutation();
            }}
            dropTargetItemSelector={shiftedDropTarget?.itemSelector}
          />
        </KeyboardNavigation>
      </FocusScope>
      {/* To not intersect last element with the scroll */}
      <Box css={{ height: theme.spacing[7] }}></Box>
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

const useExpandState = <Data extends { id: string }>({
  selectedItemSelector,
  getItemChildren,
}: {
  selectedItemSelector: undefined | ItemSelector;
  getItemChildren: (itemSelector: ItemSelector) => Data[];
}) => {
  const [expandMap, setExpandMap] = useState<Map<string, boolean>>(new Map());

  // whenever selected instance is changed
  // all its parents should be automatically expanded
  const prevSelectedItemSelector = useRef<ItemSelector>();
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
    setExpandMap((expandMap) => {
      const newExpandMap = new Map(expandMap);
      let expanded = 0;
      // do not expand the selected instance itself, start with parent
      for (let index = 1; index < selectedItemSelector.length; index += 1) {
        const key = selectedItemSelector.slice(index).join();
        if (newExpandMap.get(key) !== true) {
          newExpandMap.set(key, true);
          expanded += 1;
        }
      }
      // prevent rerender if nothing new is expanded
      return expanded === 0 ? expandMap : newExpandMap;
    });
  }, [selectedItemSelector]);

  const getIsExpanded = useCallback(
    (itemSelector: ItemSelector) => {
      // root is always expanded
      if (itemSelector.length === 1) {
        return true;
      }
      return expandMap.get(itemSelector.join()) === true;
    },
    [expandMap]
  );

  const setIsExpanded = useCallback(
    (itemSelector: ItemSelector, value: boolean, all?: boolean) => {
      setExpandMap((expandMap) => {
        const newExpandMap = new Map(expandMap);
        if (all) {
          const addChildren = (parentSelector: string[]) => {
            for (const child of getItemChildren(parentSelector)) {
              const itemSelector = [child.id, ...parentSelector];
              newExpandMap.set(itemSelector.join(), value);
              addChildren(itemSelector);
            }
          };
          newExpandMap.set(itemSelector.join(), value);
          addChildren(itemSelector);
          return newExpandMap;
        }
        newExpandMap.set(itemSelector.join(), value);
        return newExpandMap;
      });
    },
    [getItemChildren]
  );

  return { getIsExpanded, setIsExpanded };
};
