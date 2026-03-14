import { Box, theme } from "@webstudio-is/design-system";
import { Section } from "./size";

export const Size = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <Section />
  </Box>
);

export default {
  title: "Style Panel/Size",
  component: Section,
};
