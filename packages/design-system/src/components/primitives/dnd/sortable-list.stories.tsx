import { ComponentMeta } from "@storybook/react";
import { useState, useRef } from "react";
import { Box } from "../../box";
import { styled } from "../../../stitches.config";
import { useDrop, type DropTarget } from "./use-drop";
import { useDrag } from "./use-drag";
import { PlacementIndicator } from "./placement-indicator";
import { useAutoScroll } from "./use-auto-scroll";

type ItemData = { id: string; text: string };

const ListItem = styled("li", {
  display: "block",
  margin: 10,
  background: "$mint5",
  padding: 10,
  userSelect: "none",
});

const List = styled("ul", {
  display: "block",
  margin: 0,
  padding: 10,
});

const Item = ({
  data,
  isDragging,
}: {
  data: ItemData;
  isDragging: boolean;
}) => {
  return (
    <ListItem css={{ opacity: isDragging ? 0.3 : 1 }} data-id={data.id}>
      {data.text}
    </ListItem>
  );
};

export const SortableList = ({
  direction = "vertical",
  reversed = false,
}: {
  direction?: "horizontal" | "vertical" | "wrap";
  reversed?: boolean;
}) => {
  const [data, setData] = useState([
    { id: "0", text: "First" },
    { id: "1", text: "Second" },
    { id: "2", text: "Third" },
    { id: "3", text: "Fourth" },
    { id: "4", text: "Fifth" },
    { id: "5", text: "Sixth" },
    { id: "6", text: "Seventh" },
    { id: "7", text: "Eighth" },
    { id: "8", text: "Ninth" },
    { id: "9", text: "Tenth" },
    { id: "10", text: "Eleventh" },
    { id: "11", text: "Twelfth" },
    { id: "12", text: "Thirteenth" },
    { id: "13", text: "Fourteenth" },
    { id: "14", text: "Fifteenth" },
    { id: "15", text: "Sixteenth" },
    { id: "16", text: "Seventeenth" },
    { id: "17", text: "Eighteenth" },
  ] as ItemData[]);

  const [dropTarget, setDropTarget] = useState<DropTarget<true>>();
  const [dragItemId, setDragItemId] = useState<string>();
  const rootRef = useRef<HTMLUListElement | null>(null);

  const useDropHandlers = useDrop<true>({
    isDropTarget(element) {
      return element instanceof HTMLUListElement;
    },
    swapDropTarget(dropTarget) {
      if (!dropTarget) {
        if (rootRef.current === null) {
          throw new Error("should not happen");
        }
        return { data: true, element: rootRef.current };
      }
      return dropTarget;
    },
    onDropTargetChange(dropTarget) {
      setDropTarget(dropTarget);
    },
  });

  const autoScrollHandlers = useAutoScroll();

  const useDragHandlers = useDrag({
    isDragItem(element) {
      return element instanceof HTMLLIElement;
    },
    onStart(event) {
      setDragItemId(event.target.dataset.id);
      autoScrollHandlers.setEnabled(true);
    },
    onMove: (poiterCoordinate) => {
      useDropHandlers.handleMove(poiterCoordinate);
      autoScrollHandlers.handleMove(poiterCoordinate);
    },
    onEnd() {
      if (dropTarget !== undefined && dragItemId !== undefined) {
        const oldIndex = data.findIndex((item) => item.id === dragItemId);
        if (oldIndex !== -1) {
          let newIndex = dropTarget.indexWithinChildren;

          // placement.index does not take into account the fact that the drag item will be removed.
          // we need to do this to account for it.
          if (oldIndex < newIndex) {
            newIndex = Math.max(0, newIndex - 1);
          }

          if (oldIndex !== newIndex) {
            const newData = [...data];
            newData.splice(oldIndex, 1);
            newData.splice(newIndex, 0, data[oldIndex]);
            setData(newData);
          }
        }
      }

      useDropHandlers.handleEnd();
      autoScrollHandlers.setEnabled(false);
      setDragItemId(undefined);
      setDropTarget(undefined);
    },
  });

  return (
    <>
      <Box
        css={{
          height: direction === "horizontal" ? "auto" : 500,
          width: direction === "horizontal" ? 500 : 200,
          overflow: "auto",
          background: "white",
          color: "black",

          // these are needed to make scroll work with column-reverse/row-reverse below
          display: "flex",
          flexDirection: direction === "horizontal" ? "row" : "column",

          // to make DnD work we have to disable scrolling using touch
          touchAction: "none",
        }}
        ref={autoScrollHandlers.targetRef}
        onScroll={useDropHandlers.handleScroll}
      >
        <List
          ref={(element) => {
            useDropHandlers.rootRef(element);
            useDragHandlers.rootRef(element);
            rootRef.current = element;
          }}
          css={{
            li: { cursor: dragItemId === undefined ? "grab" : "default" },
            display: "flex",
            flexDirection:
              direction === "vertical"
                ? reversed
                  ? "column-reverse"
                  : "column"
                : reversed
                ? "row-reverse"
                : "row",
            flexWrap: direction === "wrap" ? "wrap" : "none",
          }}
        >
          {data.map((item) => (
            <Item
              key={item.id}
              data={item}
              isDragging={item.id === dragItemId}
            />
          ))}
        </List>
      </Box>
      {dropTarget && <PlacementIndicator placement={dropTarget.placement} />}
    </>
  );
};

export const SortableListHorizontal = (args: Args) => (
  <SortableList direction="horizontal" {...args} />
);

export const SortableListWrap = (args: Args) => (
  <SortableList direction="wrap" {...args} />
);

type Args = { reversed: boolean };

export default {
  args: {
    reversed: false,
  },
} as ComponentMeta<typeof SortableList>;
