import { Box, theme } from "@webstudio-is/design-system";
import { Section } from "./outline";

export const Outline = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <Section />
  </Box>
);

export default {
  title: "Style Panel/Outline",
  component: Section,
};
