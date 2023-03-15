import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { ListPositionIndicator } from "../list-position-indicator";
import { TreeNode, INDENT, TreeItemRenderProps } from "./tree-node";
import {
  type DropTarget,
  useHold,
  useDrop,
  useDrag,
  useAutoScroll,
  useDragCursor,
} from "../primitives/dnd";
import { Box } from "../box";
import { useHorizontalShift } from "./horizontal-shift";
import {
  type ItemSelector,
  areItemSelectorsEqual,
  getElementByItemSelector,
} from "./item-utils";

export type TreeProps<Data extends { id: string }> = {
  root: Data;
  selectedItemSelector: undefined | ItemSelector;

  canLeaveParent: (item: Data) => boolean;
  canAcceptChild: (item: Data) => boolean;
  findItemById: (root: Data, id: string) => Data | undefined;
  getItemPath: (root: Data, id: string) => Data[];
  getItemChildren: (item: Data) => Data[];
  renderItem: (props: TreeItemRenderProps<Data>) => React.ReactNode;

  onSelect?: (itemId: string) => void;
  onHover?: (item: Data | undefined) => void;
  animate?: boolean;
  onDragEnd: (event: {
    itemId: string;
    dropTarget: { itemId: string; position: number | "end" };
  }) => void;
};

export const Tree = <Data extends { id: string }>({
  root,
  selectedItemSelector,
  canLeaveParent,
  canAcceptChild,
  findItemById,
  getItemPath,
  getItemChildren,
  renderItem,
  onSelect,
  onHover,
  animate,
  onDragEnd,
}: TreeProps<Data>) => {
  const { getIsExpanded, setIsExpanded } = useExpandState({
    root,
    selectedItemSelector,
    getItemChildren,
  });

  const rootRef = useRef<HTMLElement | null>(null);

  const [dragItem, setDragItem] = useState<Data>();
  const [dropTarget, setDropTarget] = useState<DropTarget<Data>>();

  const getDropTargetElement = useCallback(
    (id: string): HTMLElement | null | undefined =>
      rootRef.current?.querySelector(`[data-drop-target-id="${id}"]`),
    []
  );

  const [shiftedDropTarget, setHorizontalShift] = useHorizontalShift({
    dragItem,
    dropTarget,
    root,
    getIsExpanded,
    getItemPath,
    getItemChildren,
    canAcceptChild,
  });

  const getFallbackDropTarget = () => {
    return {
      data: root,
      element: getDropTargetElement(root.id) as HTMLElement,
      final: true,
    };
  };

  const useHoldHandler = useHold<DropTarget<Data>>({
    isEqual: (a, b) => a.data.id === b.data.id,
    holdTimeThreshold: 600,
    onHold: (dropTarget) => {
      if (
        getItemChildren(dropTarget.data).length > 0 ||
        getIsExpanded(dropTarget.data) === false
      ) {
        setIsExpanded(dropTarget.data, true);
      }
    },
  });

  const dropHandlers = useDrop<Data>({
    emulatePointerAlwaysInRootBounds: true,

    placementPadding: 0,

    elementToData: (element) => {
      const id = (element as HTMLElement).dataset.dropTargetId;
      const instance = id && findItemById(root, id);
      return instance || false;
    },

    swapDropTarget: (dropTarget) => {
      if (dragItem === undefined || dropTarget === undefined) {
        return getFallbackDropTarget();
      }

      if (dropTarget.data.id === root.id) {
        return dropTarget;
      }

      const path = getItemPath(root, dropTarget.data.id);
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

      const data = path.find(canAcceptChild);

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
      // NOTE:
      //   redefining children like this will screw up automatic childrenOrientation detection
      //   luckily we know the orientation and can define it manually below
      return Array.from(
        element.querySelectorAll(":scope > div > [data-drop-target-id]")
      );
    },

    childrenOrientation: { type: "vertical", reverse: false },
  });

  const dragHandlers = useDrag<Data>({
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

      const instance = findItemById(root, id);

      if (instance === undefined) {
        return false;
      }

      if (canLeaveParent(instance) === false) {
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
          itemId: dragItem.id,
          dropTarget: {
            itemId: shiftedDropTarget.item.id,
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

  const autoScrollHandlers = useAutoScroll();

  useDragCursor(dragItem !== undefined);

  const keyboardNavigation = useKeyboardNavigation({
    root,
    getItemChildren,
    findItemById,
    selectedItemSelector,
    getIsExpanded,
    setIsExpanded,
    onEsc: dragHandlers.cancelCurrentDrag,
  });

  const [onMouseEnter, onMouseLeave] = useMemo(() => {
    if (onHover === undefined) {
      return [undefined, undefined];
    }
    return [(item: Data) => onHover(item), () => onHover(undefined)] as const;
  }, [onHover]);

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
          animate={animate}
          onSelect={onSelect}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          selectedItemId={selectedItemSelector?.[0]}
          itemData={root}
          level={0}
          getIsExpanded={getIsExpanded}
          setIsExpanded={setIsExpanded}
          onExpandTransitionEnd={dropHandlers.handleDomMutation}
          dropTargetItemId={shiftedDropTarget?.item?.id}
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
  findItemById,
  getIsExpanded,
  setIsExpanded,
  onEsc,
}: {
  root: Data;
  selectedItemSelector: undefined | ItemSelector;
  getItemChildren: (item: Data) => Data[];
  findItemById: (root: Data, id: string) => Data | undefined;
  getIsExpanded: (instance: Data) => boolean;
  setIsExpanded: (instance: Data, isExpanded: boolean) => void;
  onEsc: () => void;
}) => {
  const selectedItem = useMemo(() => {
    if (selectedItemSelector === undefined) {
      return undefined;
    }
    const [selectedItemId] = selectedItemSelector;
    return findItemById(root, selectedItemId);
  }, [root, selectedItemSelector, findItemById]);

  const flatCurrentlyExpandedTree = useMemo(() => {
    const result: ItemSelector[] = [];
    const traverse = (item: Data, itemSelector: ItemSelector) => {
      result.push(itemSelector);
      if (getIsExpanded(item)) {
        for (const child of getItemChildren(item)) {
          traverse(child, [child.id, ...itemSelector]);
        }
      }
    };
    traverse(root, [root.id]);
    return result;
  }, [root, getIsExpanded, getItemChildren]);

  const rootRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: ReactKeyboardEvent) => {
    // skip if nothing is selected in the tree
    if (selectedItem === undefined) {
      return;
    }

    if (event.key === "ArrowRight" && getIsExpanded(selectedItem) === false) {
      setIsExpanded(selectedItem, true);
    }
    if (event.key === "ArrowLeft" && getIsExpanded(selectedItem)) {
      setIsExpanded(selectedItem, false);
    }
    if (event.key === " ") {
      setIsExpanded(selectedItem, !getIsExpanded(selectedItem));
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
      const itemButton = getElementByItemSelector(
        rootRef.current ?? undefined,
        itemSelector
      );
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

const useExpandState = <Data extends { id: string }>({
  selectedItemSelector,
  root,
  getItemChildren,
}: {
  root: Data;
  getItemChildren: (item: Data) => Data[];
  selectedItemSelector: undefined | ItemSelector;
}) => {
  const [record, setRecord] = useState<Record<string, boolean>>({});

  // We want to automatically expand all parents of the selected instance whenever it changes
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
    const path = selectedItemSelector.slice().reverse();
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
  }, [record, selectedItemSelector]);

  const getIsExpanded = useCallback(
    (instance: Data) => {
      // root is always expanded
      if (instance.id === root.id) {
        return true;
      }

      return (
        getItemChildren(instance).length > 0 && record[instance.id] === true
      );
    },
    [record, root, getItemChildren]
  );

  const setIsExpanded = useCallback((instance: Data, expanded: boolean) => {
    setRecord((record) => ({ ...record, [instance.id]: expanded }));
  }, []);

  return { getIsExpanded, setIsExpanded };
};
