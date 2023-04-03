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
        <IconButton variant="local">
          <CrossIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="remote">
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
        <IconButton variant="local" disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="remote" disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton>
      </Flex>
      <Flex gap={2}>
        <IconButton data-state={"open"}>
          <CrossIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="preset" data-state={"open"}>
          <CrossIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="local" data-state={"open"}>
          <CrossIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="remote" data-state={"open"}>
          <CrossIcon fill="currentColor" />
        </IconButton>
      </Flex>
      <Flex gap={2}>
        <IconButton data-focused={true}>
          <CrossIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="preset" data-focused={true}>
          <CrossIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="local" data-focused={true}>
          <CrossIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="remote" data-focused={true}>
          <CrossIcon fill="currentColor" />
        </IconButton>
      </Flex>
    </Flex>
  );
};
