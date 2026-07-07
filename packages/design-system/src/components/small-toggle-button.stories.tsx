import { EyeOpenIcon, EyeClosedIcon } from "@webstudio-is/icons";
import {
  SmallToggleButton as SmallToggleButtonComponent,
  smallToggleButtonVariants,
} from "./small-toggle-button";
import { StorySection, StoryGrid } from "./storybook";
import { theme } from "../stitches.config";

export const SmallToggleButton = () => (
  <>
    <StorySection title="Variants & States">
      <StoryGrid>
        {smallToggleButtonVariants.map((variant) => (
          <StoryGrid
            css={
              variant === "contrast"
                ? {
                    backgroundColor: theme.colors.backgroundActive,
                    padding: theme.spacing[5],
                  }
                : {
                    padding: theme.spacing[5],
                  }
            }
            horizontal
            key={variant}
          >
            {[false, true].map((defaultPressed) => (
              <SmallToggleButtonComponent
                key={defaultPressed ? "pressed" : "unpressed"}
                title={`${variant} ${defaultPressed}`}
                icon={defaultPressed ? <EyeClosedIcon /> : <EyeOpenIcon />}
                defaultPressed={defaultPressed}
                variant={variant}
              />
            ))}

            {[false, true].map((defaultPressed) => (
              <SmallToggleButtonComponent
                key={defaultPressed ? "pressed" : "unpressed"}
                title={`${variant} ${defaultPressed}`}
                icon={defaultPressed ? <EyeClosedIcon /> : <EyeOpenIcon />}
                defaultPressed={defaultPressed}
                variant={variant}
                disabled
              />
            ))}
          </StoryGrid>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Focus">
      <StoryGrid>
        {smallToggleButtonVariants.map((variant) => (
          <StoryGrid
            css={
              variant === "contrast"
                ? {
                    backgroundColor: theme.colors.backgroundActive,
                    padding: theme.spacing[5],
                  }
                : {
                    padding: theme.spacing[5],
                  }
            }
            horizontal
            key={variant}
          >
            {[false, true].map((defaultPressed) => (
              <SmallToggleButtonComponent
                key={defaultPressed ? "pressed" : "unpressed"}
                title={`${variant} ${defaultPressed}`}
                icon={defaultPressed ? <EyeClosedIcon /> : <EyeOpenIcon />}
                defaultPressed={defaultPressed}
                variant={variant}
                focused
              />
            ))}
            {[false, true].map((defaultPressed) => (
              <SmallToggleButtonComponent
                key={defaultPressed ? "pressed" : "unpressed"}
                title={`${variant} ${defaultPressed}`}
                icon={defaultPressed ? <EyeClosedIcon /> : <EyeOpenIcon />}
                defaultPressed={defaultPressed}
                variant={variant}
                focused
                disabled
              />
            ))}
          </StoryGrid>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Controlled pressed">
      <StoryGrid horizontal>
        <SmallToggleButtonComponent icon={<EyeClosedIcon />} pressed={true} />
        <SmallToggleButtonComponent icon={<EyeOpenIcon />} pressed={false} />
      </StoryGrid>
    </StorySection>
  </>
);

export default {
  title: "Small Toggle Button",
  parameters: {
    // to make the variant=contrast visible
    backgrounds: { default: "Panel" },
  },
};
