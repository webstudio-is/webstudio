import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { Section } from "./transforms";

export const Transforms = () => (
  <StorySection title="Transforms">
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  </StorySection>
);

export default {
  title: "Style panel/Transforms",
  component: Section,
};
