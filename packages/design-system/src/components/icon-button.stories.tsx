import type { ComponentStory } from "@storybook/react";
import { CrossIcon } from "@webstudio-is/icons";
import { Flex } from "./flex";
import { IconButton } from "./icon-button";

export default {
  component: IconButton,
};

export const Default: ComponentStory<typeof IconButton> = () => {
  return (
    <Flex direction="column" gap={2}>
      <Flex gap={2}>
        <IconButton>
          <CrossIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="preset">
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
      </Flex>
      <Flex gap={2}>
        <IconButton disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="preset" disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="set" disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="inherited" disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton>
      </Flex>
    </Flex>
  );
};
