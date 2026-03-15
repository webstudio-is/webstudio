import { useState } from "react";
import { Label } from "./label";
import { RadioGroup, Radio as RadioComponent, RadioAndLabel } from "./radio";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Radio",
  parameters: {
    // to make the white background in the control visible
    backgrounds: { default: "Panel" },
  },
};

export const Radio = () => {
  const [value, setValue] = useState("A");
  return (
    <>
      <StorySection title="Enabled">
        <RadioGroup defaultValue="A">
          <StoryGrid horizontal>
            <RadioComponent value="A" />
            <RadioComponent value="B" />
          </StoryGrid>
        </RadioGroup>
      </StorySection>

      <StorySection title="Disabled">
        {/* @todo: We probably need to update Radix to make `disabled` work on Root.
                   Because when items are disabled the group as whole is still focusable. */}
        <RadioGroup defaultValue="A" /* disabled */>
          <StoryGrid horizontal>
            <RadioComponent value="A" disabled />
            <RadioComponent value="B" disabled />
          </StoryGrid>
        </RadioGroup>
      </StorySection>

      <StorySection title="Focussed (initially)">
        <RadioGroup defaultValue="A">
          <StoryGrid horizontal>
            <RadioComponent value="A" autoFocus />
          </StoryGrid>
        </RadioGroup>
      </StorySection>

      <StorySection title="With lables">
        <RadioGroup defaultValue="A">
          <RadioAndLabel>
            <RadioComponent value="A" id="A" />
            <Label htmlFor="A">Label A</Label>
          </RadioAndLabel>
          <RadioAndLabel>
            <RadioComponent value="B" id="B" />
            <Label htmlFor="B">Label B</Label>
          </RadioAndLabel>
        </RadioGroup>
      </StorySection>

      <StorySection title="Controlled">
        <RadioGroup value={value} onValueChange={setValue}>
          <RadioAndLabel>
            <RadioComponent value="A" id="ctrl-A" />
            <Label htmlFor="ctrl-A">Option A</Label>
          </RadioAndLabel>
          <RadioAndLabel>
            <RadioComponent value="B" id="ctrl-B" />
            <Label htmlFor="ctrl-B">Option B</Label>
          </RadioAndLabel>
          <RadioAndLabel>
            <RadioComponent value="C" id="ctrl-C" />
            <Label htmlFor="ctrl-C">Option C</Label>
          </RadioAndLabel>
        </RadioGroup>
        <Label>Selected: {value}</Label>
      </StorySection>
    </>
  );
};
