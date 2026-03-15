import { action } from "@storybook/addon-actions";
import { PositionGrid as PositionGridComponent } from "./position-grid";
import { Flex } from "./flex";
import { useState } from "react";

export default {
  title: "Position grid",
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

export const PositionGridWithKeywords = () => (
  <Flex gap="3">
    <PositionGridComponent
      focused
      selectedPosition={{ x: "center", y: "bottom" }}
      onSelect={action("onSelect")}
    />
    <PositionGridComponent
      focused
      selectedPosition={{ x: "right", y: "center" }}
      onSelect={action("onSelect")}
    />
  </Flex>
);
