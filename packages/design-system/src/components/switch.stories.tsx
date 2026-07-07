import { useState } from "react";
import { Label } from "./label";
import { Switch } from "./switch";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Switch",
};

const ControlledSwitch = () => {
  const [checked, setChecked] = useState(false);
  return (
    <StoryGrid horizontal>
      <Switch
        id="switch-controlled"
        checked={checked}
        onCheckedChange={setChecked}
      />
      <Label htmlFor="switch-controlled">{checked ? "On" : "Off"}</Label>
    </StoryGrid>
  );
};

const Story = () => {
  return (
    <>
      <StorySection title="Enabled">
        <StoryGrid horizontal>
          <Switch defaultChecked />
          <Switch />
        </StoryGrid>
      </StorySection>
      <StorySection title="Disabled">
        <StoryGrid horizontal>
          <Switch defaultChecked disabled />
          <Switch disabled />
        </StoryGrid>
      </StorySection>
      <StorySection title="Focussed (initially)">
        <Switch autoFocus />
      </StorySection>
      <StorySection title="With label">
        <StoryGrid horizontal>
          <Switch id="switch-label" defaultChecked />
          <Label htmlFor="switch-label">Enable feature</Label>
        </StoryGrid>
      </StorySection>
      <StorySection title="Controlled">
        <ControlledSwitch />
      </StorySection>
    </>
  );
};

export { Story as Switch };
