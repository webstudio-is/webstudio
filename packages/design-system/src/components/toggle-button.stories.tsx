import type { ComponentProps } from "react";
import { BorderRadiusIndividualIcon } from "@webstudio-is/icons";
import { ToggleButton as ToggleButtonComponent } from "./toggle-button";
import { StorySection, StoryGrid } from "./storybook";

const toggleButtonVariants = [
  "default",
  "preset",
  "local",
  "overwritten",
  "remote",
] as const;

export const ToggleButton = ({
  variant,
  disabled,
}: ComponentProps<typeof ToggleButtonComponent>) => (
  <>
    <StorySection title="Configurable">
      <ToggleButtonComponent variant={variant} disabled={disabled}>
        <BorderRadiusIndividualIcon fill="currentColor" />
      </ToggleButtonComponent>
    </StorySection>

    <StorySection title="Variants">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <ToggleButtonComponent key={variant} variant={variant}>
            <BorderRadiusIndividualIcon fill="currentColor" />
          </ToggleButtonComponent>
        ))}
      </StoryGrid>
    </StorySection>
    <StorySection title="Variants disabled">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <ToggleButtonComponent key={variant} variant={variant} disabled>
            <BorderRadiusIndividualIcon fill="currentColor" />
          </ToggleButtonComponent>
        ))}
      </StoryGrid>
    </StorySection>
    <StorySection title="Variants on">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <ToggleButtonComponent
            key={variant}
            variant={variant}
            data-state="on"
          >
            <BorderRadiusIndividualIcon fill="currentColor" />
          </ToggleButtonComponent>
        ))}
      </StoryGrid>
    </StorySection>
  </>
);

ToggleButton.argTypes = {
  variant: { control: "inline-radio", options: toggleButtonVariants },
  disabled: { control: "boolean" },
};

ToggleButton.args = {
  variant: "default",
  disabled: false,
};

ToggleButton.storyName = "Toggle Button";

export default {
  title: "Toggle Button",
  parameters: {
    // to make the variant=contrast visible
    backgrounds: { default: "Panel" },
  },
};
