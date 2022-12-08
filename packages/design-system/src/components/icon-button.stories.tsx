import type { ComponentStory } from "@storybook/react";
import { CrossIcon } from "@webstudio-is/icons";
import { Flex } from "./flex";
import { IconButton } from "./icon-button";

export default {
  component: IconButton,
};

export const Default: ComponentStory<typeof IconButton> = () => {
  return (
    <Flex gap={2}>
      <IconButton>
        <CrossIcon fill="currentColor" />
      </IconButton>
      <IconButton variant="setByDefault">
        <CrossIcon fill="currentColor" />
      </IconButton>
      <IconButton variant="set">
        <CrossIcon fill="currentColor" />
      </IconButton>
      <IconButton variant="inherited">
        <CrossIcon fill="currentColor" />
      </IconButton>
      <IconButton variant="active">
        <CrossIcon fill="currentColor" />
      </IconButton>
      <IconButton disabled={true}>
        <CrossIcon fill="currentColor" />
      </IconButton>
    </Flex>
  );
};
