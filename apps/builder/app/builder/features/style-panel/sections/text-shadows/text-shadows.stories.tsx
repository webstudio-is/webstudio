import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { Section } from "./text-shadows";

export const TextShadows = () => (
  <StorySection title="Text shadows">
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  </StorySection>
);

export default {
  title: "Style panel/Text Shadows",
  component: Section,
};
