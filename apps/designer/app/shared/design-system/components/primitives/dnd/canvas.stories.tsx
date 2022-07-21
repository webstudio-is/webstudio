import { ComponentMeta } from "@storybook/react";
import React, { useState, useRef } from "react";
import { Box } from "../../box";
import { useDropTarget } from "./use-drop-target";
import { useDrag } from "./use-drag";
import { usePlacement, PlacementIndicator, type Rect } from "./placement";
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

  const setDropTarget = (id: string, element: HTMLElement) => {
    dropTargetId.current = id;
    placementHandlers.handleTargetChange(element);
  };

  const dropTargetHandlers = useDropTarget({
    edgeDistanceThreshold: 10,
    isDropTarget(element: HTMLElement) {
      return elementToId(element) !== undefined;
    },
    onDropTargetChange(event) {
      const id = elementToId(event.target);
      const rootElement = rootRef.current;

      if (id === undefined || rootElement === null) {
        return;
      }

      if (id !== ROOT_ID) {
        let path = findItemPath(data, id) ?? [];

        // NOTE: not sure we should always do this.
        // Might depend on whether there's a parent with acceptsChildren, or something.
        if (event.area !== "center") {
          path = path.slice(1);
        }

        // to make sure we are not dropping on ourself
        const dragItemIndex = path.findIndex((item) => item.id === dragItemId);
        if (dragItemIndex !== -1) {
          path = path.slice(dragItemIndex + 1);
        }

        for (const item of path) {
          if (item.acceptsChildren) {
            const element = idToElement(rootElement, item.id);
            if (element) {
              setDropTarget(item.id, element);
              return;
            }
          }
        }
      }

      setDropTarget(ROOT_ID, rootElement);
    },
  });

  const autoScrollHandlers = useAutoScroll();

  const dragProps = useDrag({
    onStart(event) {
      const id = event.target.dataset.id;
      if (id == null) {
        event.cancel();
        return;
      }
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
    onPalcementChange: (event) => {
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
          rootRef.current = element;
        }}
        onScroll={() => {
          dropTargetHandlers.handleScroll();
          placementHandlers.handleScroll();
        }}
        data-id={ROOT_ID}
        {...dragProps}
      >
        <Items data={data} dragItemId={dragItemId} />
      </Box>
      {placement && <PlacementIndicator rect={placement.placementRect} />}
    </>
  );
};

export default {} as ComponentMeta<typeof Canvas>;
