import type { ComponentProps } from "react";
import { EllipsesIcon, XIcon, TrashIcon } from "@webstudio-is/icons";
import {
  SmallIconButton as SmallIconButtonComponent,
  smallIconButtonStates,
  smallIconButtonVariants,
} from "./small-icon-button";
import { StorySection, StoryGrid } from "./storybook";

const iconsMap = {
  "<EllipsesIcon>": <EllipsesIcon />,
  "<XIcon>": <XIcon />,
  "<TrashIcon>": <TrashIcon />,
} as const;

const states = [undefined, ...smallIconButtonStates];

export const SmallIconButton = ({
  icon,
  ...rest
}: Omit<ComponentProps<typeof SmallIconButtonComponent>, "icon"> & {
  icon: keyof typeof iconsMap;
}) => (
  <>
    <StorySection title="Configurable">
      <SmallIconButtonComponent icon={iconsMap[icon]} {...rest} />
    </StorySection>

    <StorySection title="Variants & States">
      <StoryGrid>
        {smallIconButtonVariants.map((variant) => (
          <StoryGrid horizontal key={variant}>
            {states.map((state) => (
              <SmallIconButtonComponent
                key={state ?? "undefined"}
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
              <SmallIconButtonComponent
                key={state ?? "undefined"}
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

SmallIconButton.argTypes = {
  icon: { control: "inline-radio", options: Object.keys(iconsMap) },
  variant: { control: "inline-radio", options: smallIconButtonVariants },
  state: { control: "inline-radio", options: states },
  focused: { control: "boolean" },
};

SmallIconButton.args = {
  icon: "<EllipsesIcon>",
  variant: "normal",
  state: undefined,
  focused: false,
};

SmallIconButton.storyName = "Small Icon Button";

export default {
  title: "Small Icon Button",
  parameters: {
    // to make the variant=contrast visible
    backgrounds: { default: "Maintenance Medium" },
  },
};
