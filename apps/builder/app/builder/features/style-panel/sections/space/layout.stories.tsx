import type { Meta } from "@storybook/react";
import type * as React from "react";
import { Box, theme } from "@webstudio-is/design-system";
import { SpaceLayout } from "./layout";

export const Layout = (
  args: Omit<React.ComponentProps<typeof SpaceLayout>, "renderCell">
) => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <SpaceLayout
      renderCell={() => <div style={{ color: "red" }}>·</div>}
      {...args}
    />
  </Box>
);

export default {
  title: "Style Panel/Space/Layout",
  component: Layout,
} as Meta<typeof Layout>;
