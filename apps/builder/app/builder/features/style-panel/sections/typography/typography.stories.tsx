import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { Section } from "./typography";

export const Typography = () => (
  <StorySection title="Typography">
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  </StorySection>
);

export default {
  title: "Style panel/Typography",
  component: Section,
};
