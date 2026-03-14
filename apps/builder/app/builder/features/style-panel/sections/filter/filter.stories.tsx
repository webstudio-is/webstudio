import { Box, theme } from "@webstudio-is/design-system";
import { Section } from "./filter";

export const Filters = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <Section />
  </Box>
);

export default {
  title: "Style Panel/Filters",
  component: Section,
};
