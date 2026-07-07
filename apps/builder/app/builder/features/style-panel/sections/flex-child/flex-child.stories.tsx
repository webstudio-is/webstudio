import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { Section } from "./flex-child";

export const FlexChild = () => (
  <StorySection title="Flex child">
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  </StorySection>
);

export default {
  title: "Style panel/Flex Child",
  component: Section,
};
