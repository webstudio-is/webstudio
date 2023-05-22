import type { ComponentMeta } from "@storybook/react";
import React from "react";
import { parseCssValue } from "../../shared/parse-css-value";
import { SpaceLayout } from "./layout";
import { ValueText as ValueTextComponent } from "./value-text";

export const ValueText = (
  args: Pick<
    React.ComponentProps<typeof ValueTextComponent>,
    "source" | "value"
  >
) => {
  const [hovered, setHovered] = React.useState<{ property: string }>();
  return (
    <SpaceLayout
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

ValueText.args = {
  source: "local",
  value: { type: "unit", value: 100, unit: "px" },
};

export default {
  title: "Space/ValueText",
  component: ValueText,
  argTypes: {
    source: {
      control: "select",
      options: ["local", "overwritten", "preset", "default", "remote"],
    },
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
} as ComponentMeta<typeof ValueText>;
