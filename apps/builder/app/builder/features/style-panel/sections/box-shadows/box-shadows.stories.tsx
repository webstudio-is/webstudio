import { Box, theme } from "@webstudio-is/design-system";
import { Section } from "./box-shadows";

export const BoxShadows = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <Section />
  </Box>
);

export default {
  title: "Style Panel/Box Shadows",
  component: Section,
};
