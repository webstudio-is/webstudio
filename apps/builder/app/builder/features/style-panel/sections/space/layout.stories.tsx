import type { Meta } from "@storybook/react";
import type * as React from "react";
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
} as Meta<typeof Layout>;
