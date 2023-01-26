import { type ComponentProps } from "react";
import { MenuIcon, CrossIcon, TrashIcon } from "@webstudio-is/icons";
import { Button as ButtonComponent } from "./button";

export default {
  title: "Library/Button",
};

const iconsMap = {
  undefined: undefined,
  "<MenuIcon>": <MenuIcon />,
  "<CrossIcon>": <CrossIcon />,
  "<TrashIcon>": <TrashIcon />,
} as const;

const variants: ReadonlyArray<
  Extract<ComponentProps<typeof ButtonComponent>["variant"], string>
> = ["primary", "neutral", "destructive", "positive", "ghost"];

const states: ReadonlyArray<
  Extract<ComponentProps<typeof ButtonComponent>["state"], string>
> = ["auto", "hover", "focus", "pressed", "pending"];

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <>
    <h3 style={{ fontFamily: "sans-serif" }}>{title}</h3>
    <div style={{ display: "flex", gap: 12 }}>{children}</div>
  </>
);

export const Button = ({
  prefix,
  suffix,
  ...rest
}: Omit<ComponentProps<typeof ButtonComponent>, "prefix" | "suffix"> & {
  prefix?: keyof typeof iconsMap;
  suffix?: keyof typeof iconsMap;
}) => (
  <>
    <Section title="Configurable">
      <ButtonComponent
        prefix={prefix && iconsMap[prefix]}
        suffix={suffix && iconsMap[suffix]}
        {...rest}
      />
    </Section>

    <Section title="Variants & States">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {variants.map((variant) => (
          <div key={variant} style={{ display: "flex", gap: 12 }}>
            {states.map((state) => (
              <ButtonComponent
                prefix={<TrashIcon />}
                state={state}
                variant={variant}
                key={state}
              >
                {variant} {state}
              </ButtonComponent>
            ))}
          </div>
        ))}
      </div>
    </Section>

    <Section title="Icon">
      <ButtonComponent prefix={<TrashIcon />}>Button</ButtonComponent>
      <ButtonComponent suffix={<TrashIcon />}>Button</ButtonComponent>
      <ButtonComponent prefix={<TrashIcon />} />
    </Section>

    <Section title="Disabled">
      <ButtonComponent disabled>Button</ButtonComponent>
      <ButtonComponent disabled prefix={<TrashIcon />}>
        Button
      </ButtonComponent>
      <ButtonComponent disabled prefix={<TrashIcon />} />
    </Section>
  </>
);

Button.argTypes = {
  children: { defaultValue: "Button", control: "text" },
  variant: {
    defaultValue: "primary",
    control: { type: "inline-radio", options: variants },
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
