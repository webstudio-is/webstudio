import { action } from "@storybook/addon-actions";
import { PositionGrid as PositionGridComponent } from "./position-grid";
import { useState } from "react";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Position Grid",
};

export const PositionGrid = () => {
  const [selectedPosition, setSelectedPosition] = useState({
    y: 50,
    x: 50,
  });
  return (
    <>
      <StorySection title="States">
        <StoryGrid horizontal>
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
        </StoryGrid>
      </StorySection>
      <StorySection title="With keywords">
        <StoryGrid horizontal>
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
        </StoryGrid>
      </StorySection>
    </>
  );
};
