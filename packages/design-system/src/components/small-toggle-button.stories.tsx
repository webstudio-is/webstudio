import type { ComponentProps } from "react";
import { EyeconOpenIcon, EyeconClosedIcon } from "@webstudio-is/icons";
import {
  SmallToggleButton,
  smallToggleButtonVariants,
} from "./small-toggle-button";
import { StorySection, StoryGrid } from "./storybook";
import { theme } from "../stitches.config";

export const Demo = ({
  pressed,
  ...rest
}: Omit<ComponentProps<typeof SmallToggleButton>, "icon">) => (
  <>
    <StorySection title="Configurable">
      <SmallToggleButton
        icon={pressed ? <EyeconClosedIcon /> : <EyeconOpenIcon />}
        {...rest}
      />
    </StorySection>

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
              <SmallToggleButton
                key={defaultPressed ? "pressed" : "unpressed"}
                title={`${variant} ${defaultPressed}`}
                icon={
                  defaultPressed ? <EyeconClosedIcon /> : <EyeconOpenIcon />
                }
                defaultPressed={defaultPressed}
                variant={variant}
              />
            ))}

            {[false, true].map((defaultPressed) => (
              <SmallToggleButton
                key={defaultPressed ? "pressed" : "unpressed"}
                title={`${variant} ${defaultPressed}`}
                icon={
                  defaultPressed ? <EyeconClosedIcon /> : <EyeconOpenIcon />
                }
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
              <SmallToggleButton
                key={defaultPressed ? "pressed" : "unpressed"}
                title={`${variant} ${defaultPressed}`}
                icon={
                  defaultPressed ? <EyeconClosedIcon /> : <EyeconOpenIcon />
                }
                defaultPressed={defaultPressed}
                variant={variant}
                focused
              />
            ))}
            {[false, true].map((defaultPressed) => (
              <SmallToggleButton
                key={defaultPressed ? "pressed" : "unpressed"}
                title={`${variant} ${defaultPressed}`}
                icon={
                  defaultPressed ? <EyeconClosedIcon /> : <EyeconOpenIcon />
                }
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
  </>
);

Demo.argTypes = {
  variant: {
    defaultValue: "normal",
    control: { type: "inline-radio", options: smallToggleButtonVariants },
  },
  pressed: {
    defaultValue: false,
    control: { type: "boolean" },
  },
  disabled: {
    defaultValue: false,
    control: { type: "boolean" },
  },
  focused: {
    defaultValue: false,
    control: { type: "boolean" },
  },
};

Demo.storyName = "Small Toggle Button";

export default {
  title: "Library/Small Toggle Button",
  parameters: {
    // to make the variant=contrast visible
    backgrounds: { default: "Panel" },
  },
};
