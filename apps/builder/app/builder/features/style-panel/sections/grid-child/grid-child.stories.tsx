import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { Section } from "./grid-child";

export const GridChild = () => (
  <StorySection title="Grid child">
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  </StorySection>
);

export default {
  title: "Style panel/Grid Child",
  component: Section,
};
