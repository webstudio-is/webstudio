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

export const ToggleButton = () => (
  <>
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

    <StorySection title="Controlled pressed">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <ToggleButtonComponent key={variant} variant={variant} pressed>
            <BorderRadiusIndividualIcon fill="currentColor" />
          </ToggleButtonComponent>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Default pressed (uncontrolled)">
      <StoryGrid horizontal>
        {toggleButtonVariants.map((variant) => (
          <ToggleButtonComponent key={variant} variant={variant} defaultPressed>
            <BorderRadiusIndividualIcon fill="currentColor" />
          </ToggleButtonComponent>
        ))}
      </StoryGrid>
    </StorySection>
  </>
);

export default {
  title: "Toggle Button",
  parameters: {
    // to make the variant=contrast visible
    backgrounds: { default: "Panel" },
  },
};
