import { Label } from "./label";
import { RadioGroup, Radio, RadioAndLabel } from "./radio";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Library/Radio",
  parameters: {
    // to make the white background in the control visible
    backgrounds: { default: "Panel" },
  },
};

export const Demo = () => {
  return (
    <>
      <StorySection title="Enabled">
        <RadioGroup defaultValue="A">
          <StoryGrid horizontal>
            <Radio value="A" />
            <Radio value="B" />
          </StoryGrid>
        </RadioGroup>
      </StorySection>

      <StorySection title="Disabled">
        {/* @todo: We probably need to update Radix to make `disabled` work on Root.
                   Because when items are disabled the group as whole is still focusable. */}
        <RadioGroup defaultValue="A" /* disabled */>
          <StoryGrid horizontal>
            <Radio value="A" disabled />
            <Radio value="B" disabled />
          </StoryGrid>
        </RadioGroup>
      </StorySection>

      <StorySection title="Focussed (initially)">
        <RadioGroup defaultValue="A">
          <StoryGrid horizontal>
            <Radio value="A" autoFocus />
          </StoryGrid>
        </RadioGroup>
      </StorySection>

      <StorySection title="With lables">
        <RadioGroup defaultValue="A">
          <RadioAndLabel>
            <Radio value="A" id="A" />
            <Label htmlFor="A">Label A</Label>
          </RadioAndLabel>
          <RadioAndLabel>
            <Radio value="B" id="B" />
            <Label htmlFor="B">Label B</Label>
          </RadioAndLabel>
        </RadioGroup>
      </StorySection>
    </>
  );
};
Demo.storyName = "Radio";
