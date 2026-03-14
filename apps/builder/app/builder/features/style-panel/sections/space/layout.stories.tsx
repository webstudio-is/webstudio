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
  title: "Style Panel/Space/Layout",
};
