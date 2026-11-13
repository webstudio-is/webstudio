import { BorderRadiusIndividualIcon } from "@webstudio-is/icons";
import { IconToggleButton, ToggleButton } from "./toggle-button";
import { StorySection, StoryGrid } from "./storybook";

const toggleButtonVariants = [
  "default",
  "preset",
  "local",
  "overwritten",
  "remote",
] as const;

export const IconToggleButtons = () => (
  <>
    <StorySection title="Variants">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <IconToggleButton
            key={variant}
            variant={variant}
            aria-label={variant}
          >
            <BorderRadiusIndividualIcon fill="currentColor" />
          </IconToggleButton>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Variants disabled">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <IconToggleButton
            key={variant}
            variant={variant}
            aria-label={variant}
            disabled
          >
            <BorderRadiusIndividualIcon fill="currentColor" />
          </IconToggleButton>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Variants on">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <IconToggleButton
            key={variant}
            variant={variant}
            aria-label={variant}
            data-state="on"
          >
            <BorderRadiusIndividualIcon fill="currentColor" />
          </IconToggleButton>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Controlled pressed">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <IconToggleButton
            key={variant}
            variant={variant}
            aria-label={variant}
            pressed
          >
            <BorderRadiusIndividualIcon fill="currentColor" />
          </IconToggleButton>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Default pressed (uncontrolled)">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <IconToggleButton
            key={variant}
            variant={variant}
            aria-label={variant}
            defaultPressed
          >
            <BorderRadiusIndividualIcon fill="currentColor" />
          </IconToggleButton>
        ))}
      </StoryGrid>
    </StorySection>
  </>
);

export const TextToggleButtons = () => (
  <StorySection title="Text toggle buttons">
    <StoryGrid horizontal>
      <ToggleButton>Inactive</ToggleButton>
      <ToggleButton pressed>Selected</ToggleButton>
    </StoryGrid>
  </StorySection>
);

export default {
  title: "Toggle Button",
  parameters: {
    // to make the variant=contrast visible
    backgrounds: { default: "Panel" },
  },
};
