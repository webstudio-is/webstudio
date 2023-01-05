import type { ComponentMeta } from "@storybook/react";
import React from "react";
import { SpaceLayout } from "./layout";

export const Layout = (
  args: Omit<React.ComponentProps<typeof SpaceLayout>, "renderCell">
) => (
  <SpaceLayout
    renderCell={() => <div style={{ color: "red" }}>·</div>}
    {...args}
  />
);

export default {
  title: "Space/Layout",
  component: Layout,
} as ComponentMeta<typeof Layout>;
