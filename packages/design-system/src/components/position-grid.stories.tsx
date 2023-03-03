import { action } from "@storybook/addon-actions";
import { PositionGrid as PositionGridComponent } from "./position-grid";
import { Flex } from "./flex";
import { useState } from "react";

export default {
  title: "Library/Position Grid",
};

export const PositionGrid = () => {
  const [selectedPosition, setSelectedPosition] = useState({
    top: 50,
    left: 50,
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
        focusedPosition={{ top: 0, left: 0 }}
      />
    </Flex>
  );
};
