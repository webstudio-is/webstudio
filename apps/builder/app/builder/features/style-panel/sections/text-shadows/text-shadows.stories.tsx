import { Box, theme } from "@webstudio-is/design-system";
import { Section } from "./text-shadows";

export const TextShadows = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <Section />
  </Box>
);

export default {
  title: "Style Panel/Text Shadows",
  component: Section,
};
