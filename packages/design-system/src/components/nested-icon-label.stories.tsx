import { NestedIconLabel } from "./nested-icon-label";
import { labelColors } from "./label";
import { RowGapIcon } from "@webstudio-is/icons";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Library/Nested Icon Label",
};

export const Demo = () => {
  return (
    <>
      <StorySection title="Default">
        <StoryGrid horizontal>
          {labelColors.map((color) => (
            <NestedIconLabel key={color} color={color}>
              <RowGapIcon />
            </NestedIconLabel>
          ))}
        </StoryGrid>
      </StorySection>
      <StorySection title="Hover">
        <StoryGrid horizontal>
          {labelColors.map((color) => (
            <NestedIconLabel key={color} color={color} hover>
              <RowGapIcon />
            </NestedIconLabel>
          ))}
        </StoryGrid>
      </StorySection>
      <StorySection title="Disabled">
        <StoryGrid horizontal>
          {labelColors.map((color) => (
            <NestedIconLabel key={color} color={color} disabled>
              <RowGapIcon />
            </NestedIconLabel>
          ))}
        </StoryGrid>
      </StorySection>
    </>
  );
};
Demo.storyName = "Nested Icon Label";
