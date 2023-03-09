import type { ComponentProps } from "react";
import { MenuIcon, CrossIcon, TrashIcon } from "@webstudio-is/icons";
import {
  SmallIconButton,
  smallIconButtonStates,
  smallIconButtonVariants,
} from "./small-icon-button";
import { StorySection, StoryGrid } from "./storybook";

const iconsMap = {
  "<MenuIcon>": <MenuIcon />,
  "<CrossIcon>": <CrossIcon />,
  "<TrashIcon>": <TrashIcon />,
} as const;

const states = [undefined, ...smallIconButtonStates];

export const Demo = ({
  icon,
  ...rest
}: Omit<ComponentProps<typeof SmallIconButton>, "icon"> & {
  icon: keyof typeof iconsMap;
}) => (
  <>
    <StorySection title="Configurable">
      <SmallIconButton icon={iconsMap[icon]} {...rest} />
    </StorySection>

    <StorySection title="Variants & States">
      <StoryGrid>
        {smallIconButtonVariants.map((variant) => (
          <StoryGrid horizontal key={variant}>
            {states.map((state) => (
              <SmallIconButton
                key={state}
                title={`${variant} ${state}`}
                icon={<TrashIcon />}
                state={state}
                variant={variant}
              />
            ))}
          </StoryGrid>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Focus">
      <StoryGrid>
        {smallIconButtonVariants.map((variant) => (
          <StoryGrid horizontal key={variant}>
            {states.map((state) => (
              <SmallIconButton
                key={state}
                title={`${variant} ${state}`}
                icon={<TrashIcon />}
                state={state}
                variant={variant}
                focused
              />
            ))}
          </StoryGrid>
        ))}
      </StoryGrid>
    </StorySection>
  </>
);

Demo.argTypes = {
  icon: {
    defaultValue: "<MenuIcon>",
    control: { type: "inline-radio", options: Object.keys(iconsMap) },
  },
  variant: {
    defaultValue: "normal",
    control: { type: "inline-radio", options: smallIconButtonVariants },
  },
  state: {
    defaultValue: undefined,
    control: {
      type: "inline-radio",
      options: states,
    },
  },
  focused: {
    defaultValue: false,
    control: { type: "boolean" },
  },
};

Demo.storyName = "Small Icon Button";

export default {
  title: "Library/Small Icon Button",
  parameters: {
    // to make the variant=contrast visible
    backgrounds: { default: "Maintenance Medium" },
  },
};
