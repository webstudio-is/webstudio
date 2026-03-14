import { Box, theme } from "@webstudio-is/design-system";
import { Section } from "./transforms";

export const Transforms = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <Section />
  </Box>
);

export default {
  title: "Style Panel/Transforms",
  component: Section,
};
