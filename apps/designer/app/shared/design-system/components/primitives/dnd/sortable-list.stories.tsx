import { ComponentMeta } from "@storybook/react";
import { useState } from "react";
import { Box } from "../../box";
import { styled } from "../../../stitches.config";
import { useDropTarget } from "./use-drop-target";
import { useDrag } from "./use-drag";
import { usePlacement, PlacementIndicator, type Rect } from "./placement";
import { useAutoScroll } from "./use-auto-scroll";

type ItemData = { id: string; text: string };

const ListItem = styled("li", {
  display: "block",
  margin: 10,
  background: "$mint12",
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
}: {
  direction?: "horizontal" | "vertical" | "wrap";
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

  const [placement, setPalcement] = useState<{
    index: number;
    placementRect: Rect;
  }>();

  const [dragItemId, setDragItemId] = useState<string>();

  const dropTargetHandlers = useDropTarget({
    isDropTarget(element: HTMLElement) {
      return element instanceof HTMLUListElement;
    },
    onDropTargetChange(event) {
      placementHandlers.handleTargetChange(event.target);
    },
  });

  const autoScrollHandlers = useAutoScroll();

  const dragProps = useDrag({
    onStart(event) {
      if (!(event.target instanceof HTMLLIElement)) {
        event.cancel();
        return;
      }
      setDragItemId(event.target.dataset.id);
      autoScrollHandlers.setEnabled(true);
    },
    onMove: (poiterCoordinate) => {
      dropTargetHandlers.handleMove(poiterCoordinate);
      autoScrollHandlers.handleMove(poiterCoordinate);
      placementHandlers.handleMove(poiterCoordinate);
    },
    onEnd() {
      if (placement !== undefined && dragItemId !== undefined) {
        const oldIndex = data.findIndex((item) => item.id === dragItemId);
        if (oldIndex !== -1) {
          let newIndex = placement.index;

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

      dropTargetHandlers.handleEnd();
      autoScrollHandlers.setEnabled(false);
      placementHandlers.handleEnd();
      setDragItemId(undefined);
      setPalcement(undefined);
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
          height: direction === "horizontal" ? "auto" : 500,
          width: direction === "wrap" ? 200 : "auto",
          overflow: "auto",
          background: "white",
          color: "black",
          touchAction: dragItemId === undefined ? "none" : "auto",
        }}
        ref={autoScrollHandlers.targetRef}
        onScroll={() => {
          dropTargetHandlers.handleScroll();
          placementHandlers.handleScroll();
        }}
        {...dragProps}
      >
        <List
          ref={dropTargetHandlers.rootRef}
          css={{
            li: { cursor: dragItemId === undefined ? "grab" : "default" },
            display: direction === "vertical" ? "block" : "flex",
            flexDirection: direction === "vertical" ? "none" : "row",
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
      {placement && <PlacementIndicator rect={placement.placementRect} />}
    </>
  );
};

export const SortableListHorizontal = () => (
  <SortableList direction="horizontal" />
);

export const SortableListWrap = () => <SortableList direction="wrap" />;

export default {} as ComponentMeta<typeof SortableList>;
