import type { StoryFn } from "@storybook/react";
import {
  Box,
  Flex,
  StorySection,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { StyleSourceBadge as StyleSourceBadgeComponent } from "./style-source-badge";

export default {
  title: "Style panel/Style Source Badge",
  component: StyleSourceBadgeComponent,
};

export const StyleSourceBadge: StoryFn<
  typeof StyleSourceBadgeComponent
> = () => (
  <StorySection title="Style Source Badge">
    <Box css={{ width: theme.sizes.sidebarWidth }}>
      <Flex direction="column" gap="3">
        <Text variant="labels">All source variants</Text>
        <Flex gap="1" wrap="wrap">
          <StyleSourceBadgeComponent source="local" variant="small">
            Local
          </StyleSourceBadgeComponent>
          <StyleSourceBadgeComponent source="token" variant="small">
            Token
          </StyleSourceBadgeComponent>
          <StyleSourceBadgeComponent source="tag" variant="small">
            Tag
          </StyleSourceBadgeComponent>
          <StyleSourceBadgeComponent source="breakpoint" variant="small">
            Breakpoint
          </StyleSourceBadgeComponent>
          <StyleSourceBadgeComponent source="instance" variant="small">
            Instance
          </StyleSourceBadgeComponent>
        </Flex>

        <Text variant="labels">Long label (truncation)</Text>
        <Flex gap="1">
          <StyleSourceBadgeComponent source="token" variant="small">
            Very long token name that should be truncated
          </StyleSourceBadgeComponent>
        </Flex>
      </Flex>
    </Box>
  </StorySection>
);
