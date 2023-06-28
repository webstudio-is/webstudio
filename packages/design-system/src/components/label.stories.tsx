import type { ComponentStory } from "@storybook/react";
import { StorySection, StoryGrid } from "./storybook";
import { Label } from "./label";
import { Box } from "./box";
import * as Popover from "@radix-ui/react-popover";
import { theme } from "../stitches.config";

export default {
  title: "Library/Label",
};

const colors = ["default", "preset", "local", "overwritten", "remote"] as const;

const LabelStory: ComponentStory<typeof Label> = ({
  color,
  disabled,
  children,
}) => {
  return (
    <>
      <StorySection title="Configurable">
        <Box>
          <Label color={color} disabled={disabled}>
            {children}
          </Label>
        </Box>
      </StorySection>

      {/* Check that spacebar is working if color property is not default */}
      <StorySection title="Configurable with Popover if color is not default">
        <Box>
          <Popover.Root>
            <Popover.Trigger asChild>
              <Label color={color} disabled={disabled}>
                {children}
              </Label>
            </Popover.Trigger>
            <Popover.Content side="bottom" align="center">
              <Box
                css={{
                  backgroundColor: theme.colors.backgroundPanel,
                  p: theme.spacing[10],
                  my: theme.spacing[2],
                }}
              >
                <input type="text" />
              </Box>
            </Popover.Content>
          </Popover.Root>
        </Box>
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
          <Label color="local" ref={(element) => element?.focus()}>
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
  children: { control: "text" },
  color: { control: "inline-radio", options: colors },
  disabled: { control: "boolean" },
};

LabelStory.args = {
  children: "Label text",
  color: "default",
  disabled: false,
};
