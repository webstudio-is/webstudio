import type { ComponentProps } from "react";
import { BorderRadiusIndividualIcon } from "@webstudio-is/icons";
import { ToggleButton } from "./toggle-button";
import { StorySection, StoryGrid } from "./storybook";

const toggleButtonVariants = [
  "default",
  "preset",
  "local",
  "overwritten",
  "remote",
] as const;

export const Demo = ({
  variant,
  disabled,
}: ComponentProps<typeof ToggleButton>) => (
  <>
    <StorySection title="Configurable">
      <ToggleButton variant={variant} disabled={disabled}>
        <BorderRadiusIndividualIcon fill="currentColor" />
      </ToggleButton>
    </StorySection>

    <StorySection title="Variants">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <ToggleButton key={variant} variant={variant}>
            <BorderRadiusIndividualIcon fill="currentColor" />
          </ToggleButton>
        ))}
      </StoryGrid>
    </StorySection>
    <StorySection title="Variants disabled">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <ToggleButton key={variant} variant={variant} disabled>
            <BorderRadiusIndividualIcon fill="currentColor" />
          </ToggleButton>
        ))}
      </StoryGrid>
    </StorySection>
    <StorySection title="Variants on">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <ToggleButton key={variant} variant={variant} data-state="on">
            <BorderRadiusIndividualIcon fill="currentColor" />
          </ToggleButton>
        ))}
      </StoryGrid>
    </StorySection>
  </>
);

Demo.argTypes = {
  variant: {
    defaultValue: "default",
    control: { type: "inline-radio", options: toggleButtonVariants },
  },
  disabled: {
    defaultValue: false,
    control: { type: "boolean" },
  },
};

Demo.storyName = "Toggle Button";

export default {
  title: "Library/Toggle Button",
  parameters: {
    // to make the variant=contrast visible
    backgrounds: { default: "Panel" },
  },
};
