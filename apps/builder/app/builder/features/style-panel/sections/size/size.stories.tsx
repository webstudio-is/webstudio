import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { Section } from "./size";

export const Size = () => (
  <StorySection title="Size">
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  </StorySection>
);

export default {
  title: "Style panel/Size",
  component: Section,
};
