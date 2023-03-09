import { action } from "@storybook/addon-actions";
import { PositionGrid as PositionGridComponent } from "./position-grid";
import { Flex } from "./flex";
import { useState } from "react";

export default {
  title: "Library/Position Grid",
};

export const PositionGrid = () => {
  const [selectedPosition, setSelectedPosition] = useState({
    y: 50,
    x: 50,
  });
  return (
    <Flex gap="3">
      <PositionGridComponent
        onSelect={(position) => {
          setSelectedPosition(position);
          action("onSelect")(position);
        }}
      />
      <PositionGridComponent
        focused
        onSelect={(position) => {
          setSelectedPosition(position);
          action("onSelect")(position);
        }}
      />
      <PositionGridComponent
        focused
        selectedPosition={selectedPosition}
        onSelect={(position) => {
          setSelectedPosition(position);
          action("onSelect")(position);
        }}
      />
      <PositionGridComponent
        focused
        selectedPosition={selectedPosition}
        onSelect={(position) => {
          setSelectedPosition(position);
          action("onSelect")(position);
        }}
        focusedPosition={{ y: 0, x: 0 }}
      />
    </Flex>
  );
};
