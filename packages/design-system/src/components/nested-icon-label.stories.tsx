import { NestedIconLabel as NestedIconLabelComponent } from "./nested-icon-label";
import { labelColors } from "./label";
import { GapVerticalIcon } from "@webstudio-is/icons";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Nested Icon Label",
};

export const NestedIconLabel = () => {
  return (
    <>
      <StorySection title="Default">
        <StoryGrid horizontal>
          {labelColors.map((color) => (
            <NestedIconLabelComponent key={color} color={color}>
              <GapVerticalIcon />
            </NestedIconLabelComponent>
          ))}
        </StoryGrid>
      </StorySection>
      <StorySection title="Hover">
        <StoryGrid horizontal>
          {labelColors.map((color) => (
            <NestedIconLabelComponent key={color} color={color} hover>
              <GapVerticalIcon />
            </NestedIconLabelComponent>
          ))}
        </StoryGrid>
      </StorySection>
      <StorySection title="Disabled">
        <StoryGrid horizontal>
          {labelColors.map((color) => (
            <NestedIconLabelComponent key={color} color={color} disabled>
              <GapVerticalIcon />
            </NestedIconLabelComponent>
          ))}
        </StoryGrid>
      </StorySection>
    </>
  );
};
