import type { ReactNode } from "react";
import type { ComponentStory } from "@storybook/react";
import { Label } from "./label";

export default {
  title: "Library/Label",
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <>
    <h3 style={{ fontFamily: "sans-serif" }}>{title}</h3>
    <div style={{ display: "flex", gap: 12 }}>{children}</div>
  </>
);

const colors = ["default", "preset", "local", "remote"] as const;

const LabelStory: ComponentStory<typeof Label> = ({
  color,
  disabled,
  children,
}) => {
  return (
    <>
      <Section title="Configurable">
        <Label color={color} disabled={disabled}>
          {children}
        </Label>
      </Section>

      <Section title="Colors">
        {colors.map((color) => (
          <Label key={color} color={color}>
            {color}
          </Label>
        ))}
      </Section>

      <Section title="With checkbox">
        <input id="checkbox1" type="checkbox"></input>
        <Label htmlFor="checkbox1">Label text</Label>
      </Section>

      <Section title="Disabled">
        <Label disabled={true}>Label text</Label>
        <div>
          <input id="checkbox2" type="checkbox" disabled={true}></input>
          <Label htmlFor="checkbox2" disabled={true}>
            Label text
          </Label>
        </div>
      </Section>
    </>
  );
};
export { LabelStory as Label };

LabelStory.argTypes = {
  children: { defaultValue: "Label text", control: "text" },
  color: {
    defaultValue: "default",
    control: { type: "inline-radio", options: colors },
  },
  disabled: { defaultValue: false, control: "boolean" },
};
