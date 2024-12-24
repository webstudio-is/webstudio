import type { ComponentProps } from "react";
import { EllipsesIcon, XIcon, TrashIcon } from "@webstudio-is/icons";
import { Button as ButtonComponent } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Text } from "./text";
import { StorySection, StoryGrid } from "./storybook";
import { theme } from "../stitches.config";

export default {
  title: "Library/Button",
};

const iconsMap = {
  undefined: undefined,
  "<EllipsesIcon>": <EllipsesIcon />,
  "<XIcon>": <XIcon />,
  "<TrashIcon>": <TrashIcon />,
} as const;

const colors: ReadonlyArray<ComponentProps<typeof ButtonComponent>["color"]> = [
  "primary",
  "neutral",
  "destructive",
  "neutral-destructive",
  "positive",
  "ghost",
  "dark",
  "gradient",
  "dark-ghost",
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
          <StoryGrid
            horizontal
            key={color}
            css={
              color === "dark-ghost"
                ? { backgroundColor: "#1E1E1E", padding: 8 }
                : undefined
            }
          >
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
            <fieldset style={{ display: "contents" }} disabled>
              <ButtonComponent prefix={<TrashIcon />} color={color}>
                {color} disabled by fieldset
              </ButtonComponent>
            </fieldset>
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

    <StorySection title="Preserves size when pending">
      <StoryGrid
        css={{
          alignItems: "flex-start",
        }}
      >
        <ButtonComponent>Any content to preserve size</ButtonComponent>
        <ButtonComponent state="pending">
          Any content to preserve size
        </ButtonComponent>
      </StoryGrid>
    </StorySection>

    <StorySection title="Used as a Trigger for something that opens">
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <ButtonComponent prefix={<TrashIcon />}>Open</ButtonComponent>
        </PopoverTrigger>
        <PopoverContent css={{ padding: theme.panel.padding }}>
          <Text>Some content</Text>
        </PopoverContent>
      </Popover>
    </StorySection>
  </>
);

Button.argTypes = {
  children: { control: "text" },
  color: { control: "inline-radio", options: colors },
  prefix: { control: "inline-radio", options: Object.keys(iconsMap) },
  suffix: { control: "inline-radio", options: Object.keys(iconsMap) },
  disabled: { control: "boolean" },
  state: { control: "inline-radio", options: states },
};

Button.args = {
  children: "Button",
  color: "primary",
  prefix: "undefined",
  suffix: "undefined",
  disabled: false,
  state: "auto",
};
