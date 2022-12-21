import type { ComponentMeta } from "@storybook/react";
import React from "react";
import { SpacingLayout } from "./layout";

export const Layout = (
  args: Omit<React.ComponentProps<typeof SpacingLayout>, "renderCell">
) => (
  <SpacingLayout
    renderCell={() => <div style={{ color: "red" }}>·</div>}
    {...args}
  />
);

export default {
  title: "Spacing/Layout",
  component: Layout,
} as ComponentMeta<typeof Layout>;
