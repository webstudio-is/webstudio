import type { StoryFn } from "@storybook/react";
import { XIcon } from "@webstudio-is/icons";
import { Flex } from "./flex";
import { IconButton } from "./icon-button";

export default {
  component: IconButton,
};

export const Default: StoryFn<typeof IconButton> = () => {
  return (
    <Flex direction="column" gap={2}>
      <Flex gap={2}>
        <IconButton>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="preset">
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="local">
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="overwritten">
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="remote">
          <XIcon fill="currentColor" />
        </IconButton>
      </Flex>
      <Flex gap={2}>
        <IconButton disabled={true}>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="preset" disabled={true}>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="local" disabled={true}>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="overwritten" disabled={true}>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="remote" disabled={true}>
          <XIcon fill="currentColor" />
        </IconButton>
      </Flex>
      <Flex gap={2}>
        <IconButton data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="preset" data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="local" data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="overwritten" data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="remote" data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButton>
      </Flex>
      <Flex gap={2}>
        <IconButton data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="preset" data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="local" data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="overwritten" data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButton>
        <IconButton variant="remote" data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButton>
      </Flex>
    </Flex>
  );
};
