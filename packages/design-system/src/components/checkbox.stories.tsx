import { useState } from "react";
import { Label } from "./label";
import { Checkbox as CheckboxComponent, CheckboxAndLabel } from "./checkbox";
import { StorySection, StoryGrid } from "./storybook";
import { Tooltip } from "./tooltip";

export default {
  title: "Checkbox",
  parameters: {
    // to make the white background in the control visible
    backgrounds: { default: "Panel" },
  },
};

const ControlledCheckbox = () => {
  const [checked, setChecked] = useState<boolean | "indeterminate">(false);
  return (
    <StoryGrid horizontal>
      <CheckboxAndLabel>
        <CheckboxComponent
          checked={checked}
          onCheckedChange={setChecked}
          id="controlled"
        />
        <Label htmlFor="controlled">State: {String(checked)}</Label>
      </CheckboxAndLabel>
    </StoryGrid>
  );
};

export const Checkbox = () => {
  return (
    <>
      <StorySection title="Enabled">
        <StoryGrid horizontal>
          <CheckboxComponent defaultChecked />
          <CheckboxComponent defaultChecked="indeterminate" />
          <CheckboxComponent />
        </StoryGrid>
      </StorySection>

      <StorySection title="Disabled">
        <StoryGrid horizontal>
          <CheckboxComponent defaultChecked disabled />
          <CheckboxComponent defaultChecked="indeterminate" disabled />
          <CheckboxComponent disabled />
        </StoryGrid>
      </StorySection>

      <StorySection title="Focussed (initially)">
        <StoryGrid horizontal>
          <CheckboxComponent defaultChecked autoFocus />
        </StoryGrid>
      </StorySection>

      <StorySection title="With lables">
        <CheckboxAndLabel>
          <CheckboxComponent defaultChecked id="A" />
          <Label htmlFor="A">Label A</Label>
        </CheckboxAndLabel>
        <CheckboxAndLabel>
          <CheckboxComponent id="B" />
          <Label htmlFor="B">Label B</Label>
        </CheckboxAndLabel>
      </StorySection>

      <StorySection title="With Tooltip">
        <Tooltip content="Tooltip content">
          <CheckboxComponent defaultChecked />
        </Tooltip>
        <Tooltip content="Tooltip content">
          <CheckboxComponent disabled />
        </Tooltip>
      </StorySection>

      <StorySection title="Controlled">
        <ControlledCheckbox />
      </StorySection>
    </>
  );
};
