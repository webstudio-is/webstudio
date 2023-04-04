import { NestedSelectButton } from "./nested-select-button";
import { StoryGrid, StorySection } from "./storybook";

export default {
  title: "Library/Nested Select Button",
};

export const Demo = () => {
  return (
    <>
      <StorySection title="Text">
        <StoryGrid horizontal>
          <NestedSelectButton>px</NestedSelectButton>
          <NestedSelectButton data-state="hover">px</NestedSelectButton>
          <NestedSelectButton data-state="open">px</NestedSelectButton>
          <NestedSelectButton disabled>px</NestedSelectButton>
        </StoryGrid>
      </StorySection>
      <StorySection title="Icon">
        <StoryGrid horizontal>
          <NestedSelectButton />
          <NestedSelectButton data-state="hover" />
          <NestedSelectButton data-state="open" />
          <NestedSelectButton disabled />
        </StoryGrid>
      </StorySection>
    </>
  );
};

Demo.storyName = "Nested Select Button";
