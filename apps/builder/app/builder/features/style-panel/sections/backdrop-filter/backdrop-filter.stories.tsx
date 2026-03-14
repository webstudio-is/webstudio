import { Box, theme } from "@webstudio-is/design-system";
import { Section } from "./backdrop-filter";

export const BackdropFilters = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <Section />
  </Box>
);

export default {
  title: "Style Panel/Backdrop Filters",
  component: Section,
};
