import { Box, StorySection, theme } from "@webstudio-is/design-system";
import { Section } from "./layout";

export const Layout = () => (
  <StorySection title="Layout">
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Section />
    </Box>
  </StorySection>
);

export default {
  title: "Style panel/Layout",
  component: Section,
};
