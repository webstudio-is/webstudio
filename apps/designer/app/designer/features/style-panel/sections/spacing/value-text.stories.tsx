import type { ComponentStory, ComponentMeta } from "@storybook/react";
import React from "react";
import { SpacingLayout } from "./layout";
import { ValueText as ValueTextCommponent } from "./value-text";

const Template = (
  args: Pick<
    React.ComponentProps<typeof ValueTextCommponent>,
    "source" | "value"
  >
) => {
  const [hovered, setHovered] = React.useState<{ property: string }>();
  return (
    <SpacingLayout
      onHover={setHovered}
      onClick={() => null}
      renderCell={({ property }) => (
        <ValueTextCommponent
          isActive={property === hovered?.property}
          {...args}
        />
      )}
    />
  );
};

export default {
  title: "ValueText",
  component: Template,
  argTypes: {
    source: { control: "select", options: ["set", "unset", "inherited"] },
    value: {
      control: "select",
      options: {
        "0": { type: "unit", value: 0, unit: "number" },
        "10rem": { type: "unit", value: 10, unit: "rem" },
        "100rem": { type: "unit", value: 100, unit: "rem" },
        "100px": { type: "unit", value: 100, unit: "px" },
        "1000px": { type: "unit", value: 1000, unit: "px" },
        "10000px": { type: "unit", value: 10000, unit: "px" },
        "100000px": { type: "unit", value: 100000, unit: "px" },
        auto: { type: "keyword", value: "auto" },
        "revert-layer": { type: "keyword", value: "revert-layer" },
      },
    },
  },
} as ComponentMeta<typeof Template>;

export const ValueText: ComponentStory<typeof Template> = Template.bind({});
ValueText.args = {
  source: "set",
  value: { type: "unit", value: 100, unit: "px" },
};
