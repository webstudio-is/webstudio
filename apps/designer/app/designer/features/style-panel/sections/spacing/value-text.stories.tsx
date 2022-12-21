import type { ComponentStory, ComponentMeta } from "@storybook/react";
import React from "react";
import { parseCssValue } from "../../shared/parse-css-value";
import { SpacingLayout } from "./layout";
import { ValueText as ValueTextComponent } from "./value-text";

const Template = (
  args: Pick<
    React.ComponentProps<typeof ValueTextComponent>,
    "source" | "value"
  >
) => {
  const [hovered, setHovered] = React.useState<{ property: string }>();
  return (
    <SpacingLayout
      onHover={setHovered}
      onClick={() => null}
      renderCell={({ property }) => (
        <ValueTextComponent
          isActive={property === hovered?.property}
          {...args}
        />
      )}
    />
  );
};

export default {
  title: "Spacing/ValueText",
  component: Template,
  argTypes: {
    source: { control: "select", options: ["set", "unset", "inherited"] },
    value: {
      control: "select",
      options: Object.fromEntries(
        [
          "0",
          "10rem",
          "100rem",
          "100px",
          "1000px",
          "10000px",
          "100000px",
          "auto",
          "revert-layer",
        ].map((value) => [value, parseCssValue("marginTop", value)])
      ),
    },
  },
} as ComponentMeta<typeof Template>;

export const ValueText: ComponentStory<typeof Template> = Template.bind({});
ValueText.args = {
  source: "set",
  value: { type: "unit", value: 100, unit: "px" },
};
