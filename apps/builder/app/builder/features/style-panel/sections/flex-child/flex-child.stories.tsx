import { Box, theme } from "@webstudio-is/design-system";
import { Section } from "./flex-child";

export const FlexChild = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <Section />
  </Box>
);

export default {
  title: "Style panel/Flex child",
  component: Section,
};
