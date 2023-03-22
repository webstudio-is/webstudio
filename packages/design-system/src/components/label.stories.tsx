import type { ComponentStory } from "@storybook/react";
import { StorySection, StoryGrid } from "./storybook";
import { Label } from "./label";

export default {
  title: "Library/Label",
};

const colors = ["default", "preset", "local", "remote"] as const;

const LabelStory: ComponentStory<typeof Label> = ({
  color,
  disabled,
  children,
}) => {
  return (
    <>
      <StorySection title="Configurable">
        <Label color={color} disabled={disabled}>
          {children}
        </Label>
      </StorySection>

      <StorySection title="Colors">
        <StoryGrid horizontal>
          {colors.map((color) => (
            <Label key={color} color={color}>
              {color}
            </Label>
          ))}
        </StoryGrid>
      </StorySection>

      <StorySection title="Section title">
        <StoryGrid horizontal>
          {colors.map((color) => (
            <Label key={color} color={color} sectionTitle>
              {color}
            </Label>
          ))}
        </StoryGrid>
      </StorySection>

      <StorySection title="Focused (initially)">
        <StoryGrid horizontal>
          <Label
            color="local"
            tabIndex={-1}
            ref={(element) => element?.focus()}
          >
            Local
          </Label>
        </StoryGrid>
      </StorySection>

      <StorySection title="With checkbox">
        <input id="checkbox1" type="checkbox"></input>
        <Label htmlFor="checkbox1">Label text</Label>
      </StorySection>

      <StorySection title="Disabled">
        <StoryGrid horizontal>
          <Label disabled={true}>Label text</Label>
          <div>
            <input id="checkbox2" type="checkbox" disabled={true}></input>
            <Label htmlFor="checkbox2" disabled={true}>
              Label text
            </Label>
          </div>
        </StoryGrid>
      </StorySection>
    </>
  );
};
export { LabelStory as Label };

LabelStory.argTypes = {
  children: { defaultValue: "Label text", control: "text" },
  color: {
    defaultValue: "default",
    control: { type: "inline-radio", options: colors },
  },
  disabled: { defaultValue: false, control: "boolean" },
};
