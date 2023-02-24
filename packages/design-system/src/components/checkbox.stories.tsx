import { Label } from "./label";
import { Checkbox, CheckboxAndLabel } from "./checkbox";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Library/Checkbox",
  parameters: {
    // to make the white background in the control visible
    backgrounds: { default: "Panel" },
  },
};

export const Demo = () => {
  return (
    <>
      <StorySection title="Enabled">
        <StoryGrid horizontal>
          <Checkbox defaultChecked />
          <Checkbox defaultChecked="indeterminate" />
          <Checkbox />
        </StoryGrid>
      </StorySection>

      <StorySection title="Disabled">
        <StoryGrid horizontal>
          <Checkbox defaultChecked disabled />
          <Checkbox defaultChecked="indeterminate" disabled />
          <Checkbox disabled />
        </StoryGrid>
      </StorySection>

      <StorySection title="Focussed (initially)">
        <StoryGrid horizontal>
          <Checkbox defaultChecked autoFocus />
        </StoryGrid>
      </StorySection>

      <StorySection title="With lables">
        <CheckboxAndLabel>
          <Checkbox defaultChecked id="A" />
          <Label htmlFor="A">Label A</Label>
        </CheckboxAndLabel>
        <CheckboxAndLabel>
          <Checkbox id="B" />
          <Label htmlFor="B">Label B</Label>
        </CheckboxAndLabel>
      </StorySection>
    </>
  );
};
Demo.storyName = "Checkbox";
