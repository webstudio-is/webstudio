import { Box, theme } from "@webstudio-is/design-system";
import { Section } from "./grid-child";

export const GridChild = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <Section />
  </Box>
);

export default {
  title: "Style Panel/Grid Child",
  component: Section,
};
