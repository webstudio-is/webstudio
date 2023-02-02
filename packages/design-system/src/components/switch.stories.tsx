import { Switch } from "./switch";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Library/Switch",
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
