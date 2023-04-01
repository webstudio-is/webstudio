import type { ComponentProps } from "react";
import { MenuIcon, CrossIcon, TrashIcon } from "@webstudio-is/icons";
import { Button as ButtonComponent } from "./button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverContentContainer,
} from "./popover";
import { Text } from "./text";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Library/Button",
};

const iconsMap = {
  undefined: undefined,
  "<MenuIcon>": <MenuIcon />,
  "<CrossIcon>": <CrossIcon />,
  "<TrashIcon>": <TrashIcon />,
} as const;

const colors: ReadonlyArray<ComponentProps<typeof ButtonComponent>["color"]> = [
  "primary",
  "neutral",
  "destructive",
  "positive",
  "ghost",
  "dark",
  "gradient",
];

const states: ReadonlyArray<ComponentProps<typeof ButtonComponent>["state"]> = [
  "auto",
  "hover",
  "focus",
  "pressed",
  "pending",
];

export const Button = ({
  prefix,
  suffix,
  ...rest
}: Omit<ComponentProps<typeof ButtonComponent>, "prefix" | "suffix"> & {
  prefix?: keyof typeof iconsMap;
  suffix?: keyof typeof iconsMap;
}) => (
  <>
    <StorySection title="Configurable">
      <ButtonComponent
        prefix={prefix && iconsMap[prefix]}
        suffix={suffix && iconsMap[suffix]}
        {...rest}
      />
    </StorySection>

    <StorySection title="Colors & States">
      <StoryGrid>
        {colors.map((color) => (
          <StoryGrid horizontal key={color}>
            {states.map((state) => (
              <ButtonComponent
                prefix={<TrashIcon />}
                state={state}
                color={color}
                key={state}
              >
                {color} {state}
              </ButtonComponent>
            ))}
            <ButtonComponent prefix={<TrashIcon />} color={color} disabled>
              {color} disabled
            </ButtonComponent>
          </StoryGrid>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Icon">
      <StoryGrid horizontal>
        <ButtonComponent prefix={<TrashIcon />}>Button</ButtonComponent>
        <ButtonComponent suffix={<TrashIcon />}>Button</ButtonComponent>
        <ButtonComponent prefix={<TrashIcon />} />
      </StoryGrid>
    </StorySection>

    <StorySection title="Used as a Trigger for something that opens">
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <ButtonComponent prefix={<TrashIcon />}>Open</ButtonComponent>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverContentContainer>
            <Text>Some content</Text>
          </PopoverContentContainer>
        </PopoverContent>
      </Popover>
    </StorySection>
  </>
);

Button.argTypes = {
  children: { defaultValue: "Button", control: "text" },
  color: {
    defaultValue: "primary",
    control: { type: "inline-radio", options: colors },
  },
  prefix: {
    defaultValue: "undefined",
    control: { type: "inline-radio", options: Object.keys(iconsMap) },
  },
  suffix: {
    defaultValue: "undefined",
    control: { type: "inline-radio", options: Object.keys(iconsMap) },
  },
  disabled: { defaultValue: false, control: "boolean" },
  state: {
    defaultValue: "auto",
    control: {
      type: "inline-radio",
      options: states,
    },
  },
};
