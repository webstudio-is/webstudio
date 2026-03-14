import { Box, theme } from "@webstudio-is/design-system";
import { Section } from "./layout";

export const Layout = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <Section />
  </Box>
);

export default {
  title: "Style Panel/Layout",
  component: Section,
};
