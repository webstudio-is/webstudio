import { ComponentMeta } from "@storybook/react";
import React, { useState, useRef } from "react";
import { Box } from "../../box";
import { useDropTarget } from "./use-drop-target";
import { useDrag } from "./use-drag";
import { type Rect } from "./rect";
import { usePlacement, PlacementIndicator } from "./placement";
import { useAutoScroll } from "./use-auto-scroll";

const ROOT_ID = "root";

type ItemData = {
  id: string;
  style: React.CSSProperties;
  acceptsChildren: boolean;
  children: ItemData[];
};

const Item = ({
  data,
  dragItemId,
}: {
  data: ItemData;
  dragItemId: string | undefined;
}) => {
  return (
    <Box
      css={{
        opacity: dragItemId === data.id ? 0.3 : 1,
        minWidth: 100,
        minHeight: 100,
        margin: 10,
        padding: 10,
        background: "$mint12",
        border: "1px solid $mint9",
      }}
      style={data.style}
      data-id={data.id}
      title={JSON.stringify({ id: data.id, style: data.style }, null, 2)}
    >
      <Items data={data.children} dragItemId={dragItemId} />
    </Box>
  );
};

const Items = ({
  data,
  dragItemId,
}: {
  data: ItemData[];
  dragItemId: string | undefined;
}) => {
  return (
    <>
      {data.map((child) => (
        <Item data={child} dragItemId={dragItemId} key={child.id} />
      ))}
    </>
  );
};

const elementToId = (element: HTMLElement) => element.dataset.id;

const idToElement = (
  root: HTMLElement,
  id: string
): HTMLElement | undefined => {
  if (elementToId(root) === id) {
    return root;
  }
  for (const child of root.children) {
    if (child instanceof HTMLElement) {
      const found = idToElement(child, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
};

const mapItems = (
  data: ItemData[],
  fn: (item: ItemData) => ItemData
): ItemData[] => {
  return fn({
    id: ROOT_ID,
    style: {},
    acceptsChildren: true,
    children: data.map((item) => {
      return fn({
        ...item,
        children: mapItems(item.children, fn),
      });
    }),
  }).children;
};

const findItem = (data: ItemData[], id: string): ItemData | undefined => {
  for (const item of data) {
    if (item.id === id) {
      return item;
    }
    const found = findItem(item.children, id);
    if (found) {
      return found;
    }
  }
  return undefined;
};

const findItemPath = (data: ItemData[], id: string): ItemData[] | undefined => {
  for (const item of data) {
    if (item.id === id) {
      return [item];
    }
    const found = findItemPath(item.children, id);
    if (found) {
      return [...found, item];
    }
  }
  return undefined;
};

export const Canvas = () => {
  const [data, setData] = useState<ItemData[]>([
    {
      id: "0",
      style: {},
      children: [
        { id: "1", style: { margin: 0 }, children: [], acceptsChildren: true },
        { id: "2", style: { margin: 0 }, children: [], acceptsChildren: true },
        { id: "3", style: { margin: 0 }, children: [], acceptsChildren: true },
      ],
      acceptsChildren: true,
    },
    { id: "4", style: {}, children: [], acceptsChildren: true },
    { id: "5", style: {}, children: [], acceptsChildren: true },
    { id: "6", style: {}, children: [], acceptsChildren: false },
  ]);

  const [placement, setPalcement] = useState<{
    index: number;
    placementRect: Rect;
  }>();

  const [dragItemId, setDragItemId] = useState<string>();

  const dropTargetId = useRef<string>();
  const rootRef = useRef<HTMLElement | null>(null);

  const dropTargetHandlers = useDropTarget<string>({
    edgeDistanceThreshold: 10,
    isDropTarget(element: HTMLElement) {
      return elementToId(element) ?? false;
    },
    swapDropTarget(dropTarget) {
      const rootElement = rootRef.current;
      if (rootElement === null) {
        return dropTarget;
      }

      const { data: id, area } = dropTarget;

      if (id === ROOT_ID) {
        return dropTarget;
      }

      const path = findItemPath(data, id) ?? [];

      if (area !== "center") {
        path.shift();
      }

      // Don't allow to dpop inside drag item or any of its children
      const dragItemIndex = path.findIndex((item) => item.id === dragItemId);
      if (dragItemIndex !== -1) {
        path.splice(0, dragItemIndex + 1);
      }

      const newItem = path.find((item) => item.acceptsChildren);

      if (newItem === undefined) {
        return { data: ROOT_ID, element: rootElement };
      }

      const element = idToElement(rootElement, newItem.id);

      if (element === undefined) {
        return { data: ROOT_ID, element: rootElement };
      }

      return { data: newItem.id, element };
    },

    onDropTargetChange({ data, element }) {
      dropTargetId.current = data;
      placementHandlers.handleTargetChange(element);
    },
  });

  const autoScrollHandlers = useAutoScroll();

  const useDragHandlers = useDrag<string>({
    isDragItem(element) {
      const id = element instanceof HTMLElement && element.dataset.id;
      if (id) {
        return id;
      }
      return false;
    },
    onStart({ data: id }) {
      setDragItemId(id);
      autoScrollHandlers.setEnabled(true);
    },
    onMove: (poiterCoordinate) => {
      dropTargetHandlers.handleMove(poiterCoordinate);
      autoScrollHandlers.handleMove(poiterCoordinate);
      placementHandlers.handleMove(poiterCoordinate);
    },
    onEnd() {
      const currentDropTargetId = dropTargetId.current;
      if (
        placement !== undefined &&
        dragItemId !== undefined &&
        currentDropTargetId !== undefined
      ) {
        setData((current) => {
          const dragItem = findItem(current, dragItemId);

          // shouldn't happen, for TypeScript
          if (dragItem === undefined) {
            return current;
          }

          return mapItems(current, (item) => {
            let children = item.children;

            const oldIndex = children.findIndex(
              (child) => child.id === dragItemId
            );

            if (oldIndex !== -1) {
              children = children.slice();
              children.splice(oldIndex, 1);
            }

            if (item.id === currentDropTargetId) {
              // placement.index does not take into account the fact that the drag item will be removed.
              // we need to do this to account for it.
              const newIndex =
                oldIndex !== -1 && oldIndex < placement.index
                  ? placement.index - 1
                  : placement.index;

              children = children.slice();
              children.splice(newIndex, 0, dragItem);
            }

            return children === item.children ? item : { ...item, children };
          });
        });
      }

      dropTargetHandlers.handleEnd();
      autoScrollHandlers.setEnabled(false);
      placementHandlers.handleEnd();
      setDragItemId(undefined);
      setPalcement(undefined);
      dropTargetId.current = undefined;
    },
  });

  const placementHandlers = usePlacement({
    onPlacementChange: (event) => {
      setPalcement(event);
    },
  });

  return (
    <>
      <Box
        css={{
          background: "white",
          padding: 10,
          width: 500,
          height: 500,
          overflow: "auto",
          // to make DnD work we have to disable scrolling using touch
          touchAction: "none",
          "[data-id]": {
            cursor: dragItemId === undefined ? "grab" : "default",
          },
        }}
        ref={(element) => {
          dropTargetHandlers.rootRef(element);
          autoScrollHandlers.targetRef(element);
          useDragHandlers.rootRef(element);
          rootRef.current = element;
        }}
        onScroll={() => {
          dropTargetHandlers.handleScroll();
          placementHandlers.handleScroll();
        }}
        data-id={ROOT_ID}
      >
        <Items data={data} dragItemId={dragItemId} />
      </Box>
      {placement && <PlacementIndicator rect={placement.placementRect} />}
    </>
  );
};

export default {} as ComponentMeta<typeof Canvas>;
