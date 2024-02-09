import type { ComponentProps } from "react";
import { EllipsesIcon, CrossIcon, TrashIcon } from "@webstudio-is/icons";
import {
  SmallIconButton,
  smallIconButtonStates,
  smallIconButtonVariants,
} from "./small-icon-button";
import { StorySection, StoryGrid } from "./storybook";

const iconsMap = {
  "<EllipsesIcon>": <EllipsesIcon />,
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
              <SmallIconButton
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

Demo.argTypes = {
  icon: { control: "inline-radio", options: Object.keys(iconsMap) },
  variant: { control: "inline-radio", options: smallIconButtonVariants },
  state: { control: "inline-radio", options: states },
  focused: { control: "boolean" },
};

Demo.args = {
  icon: "<EllipsesIcon>",
  variant: "normal",
  state: undefined,
  focused: false,
};

Demo.storyName = "Small Icon Button";

export default {
  title: "Library/Small Icon Button",
  parameters: {
    // to make the variant=contrast visible
    backgrounds: { default: "Maintenance Medium" },
  },
};
