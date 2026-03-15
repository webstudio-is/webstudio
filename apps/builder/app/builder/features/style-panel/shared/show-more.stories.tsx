import { Box, Text, theme } from "@webstudio-is/design-system";
import { ShowMore as ShowMoreComponent } from "./show-more";

export default {
  title: "Style panel/Show more",
  component: ShowMoreComponent,
};

export const ShowMore = () => (
  <Box css={{ width: theme.sizes.sidebarWidth }}>
    <ShowMoreComponent
      styleConfigs={[
        <Text key="1">First config item</Text>,
        <Text key="2">Second config item</Text>,
        <Text key="3">Third config item</Text>,
      ]}
    />
  </Box>
);
