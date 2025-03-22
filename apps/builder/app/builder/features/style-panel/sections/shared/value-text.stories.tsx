import type { Meta } from "@storybook/react";
import { type ComponentProps, useState } from "react";
import { parseCssValue } from "@webstudio-is/css-data";
import { SpaceLayout } from "../space/layout";
import { ValueText as ValueTextComponent } from "./value-text";

export const ValueText = (
  args: Pick<ComponentProps<typeof ValueTextComponent>, "source" | "value">
) => {
  const [_hovered, setHovered] = useState<{ property: string }>();
  return (
    <SpaceLayout
      onHover={setHovered}
      onClick={() => null}
      renderCell={() => <ValueTextComponent {...args} />}
    />
  );
};

ValueText.args = {
  source: "local",
  value: { type: "unit", value: 100, unit: "px" },
};

const valueOptions = [
  "0",
  "10rem",
  "100rem",
  "100px",
  "1000px",
  "10000px",
  "100000px",
  "auto",
  "revert-layer",
];

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
      options: valueOptions,
      labels: Object.fromEntries(
        valueOptions.map((value) => [value, parseCssValue("margin-top", value)])
      ),
    },
  },
} as Meta<typeof ValueText>;
