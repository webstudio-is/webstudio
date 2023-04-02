import type { ComponentStory } from "@storybook/react";
import { Flex } from "@webstudio-is/design-system";
import { StyleSourceBadge } from "./style-source-badge";

export default {
  component: StyleSourceBadge,
};

export const All: ComponentStory<typeof StyleSourceBadge> = () => {
  return (
    <Flex gap="1">
      <StyleSourceBadge source="tag" variant="small">
        Tag
      </StyleSourceBadge>
      <StyleSourceBadge source="token" variant="small">
        Token
      </StyleSourceBadge>
    </Flex>
  );
};
