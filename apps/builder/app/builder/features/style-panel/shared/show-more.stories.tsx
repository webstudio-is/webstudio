import { Box, StorySection, Text, theme } from "@webstudio-is/design-system";
import { ShowMore as ShowMoreComponent } from "./show-more";

export default {
  title: "Style panel/Show More",
  component: ShowMoreComponent,
};

export const ShowMore = () => (
  <StorySection title="Show More">
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <ShowMoreComponent
        styleConfigs={[
          <Text key="1">First config item</Text>,
          <Text key="2">Second config item</Text>,
          <Text key="3">Third config item</Text>,
        ]}
      />
    </Box>
  </StorySection>
);
