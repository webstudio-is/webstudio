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
  cursor: "grab",
});

const List = styled("ul", {
  display: "block",
  margin: 0,
  padding: 10,
});

const Item = ({ data }: { data: ItemData }) => {
  return <ListItem>{data.text}</ListItem>;
};

export const SortableList = () => {
  const [data, _setData] = useState([
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
      autoScrollHandlers.setEnabled(true);
    },
    onMove: (poiterCoordinate) => {
      dropTargetHandlers.handleMove(poiterCoordinate);
      autoScrollHandlers.handleMove(poiterCoordinate);
      placementHandlers.handleMove(poiterCoordinate);
    },
    onEnd() {
      dropTargetHandlers.handleEnd();
      autoScrollHandlers.setEnabled(false);
      placementHandlers.handleEnd();
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
          height: 500,
          overflow: "auto",
          background: "white",
          color: "black",
        }}
        ref={autoScrollHandlers.targetRef}
        onScroll={() => {
          dropTargetHandlers.handleScroll();
          placementHandlers.handleScroll();
        }}
        {...dragProps}
      >
        <List ref={dropTargetHandlers.rootRef}>
          {data.map((item) => (
            <Item key={item.id} data={item} />
          ))}
        </List>
      </Box>
      {placement && <PlacementIndicator rect={placement.placementRect} />}
    </>
  );
};

export default {} as ComponentMeta<typeof SortableList>;
