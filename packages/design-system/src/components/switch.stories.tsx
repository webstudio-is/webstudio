import { useState } from "react";
import { Label } from "./label";
import { Switch } from "./switch";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Switch",
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
    </>
  );
};

export { Story as Switch };

export const SwitchWithLabel = () => (
  <StorySection title="With label">
    <StoryGrid horizontal>
      <Switch id="switch-label" defaultChecked />
      <Label htmlFor="switch-label">Enable feature</Label>
    </StoryGrid>
  </StorySection>
);

export const SwitchControlled = () => {
  const [checked, setChecked] = useState(false);
  return (
    <StorySection title="Controlled">
      <StoryGrid horizontal>
        <Switch
          id="switch-controlled"
          checked={checked}
          onCheckedChange={setChecked}
        />
        <Label htmlFor="switch-controlled">{checked ? "On" : "Off"}</Label>
      </StoryGrid>
    </StorySection>
  );
};
