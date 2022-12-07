import type { ComponentStory } from "@storybook/react";
import { CrossIcon } from "@webstudio-is/icons";
import { Flex } from "./flex";
import { IconButton2 } from "./icon-button2";

export default {
  component: IconButton2,
};

export const Default: ComponentStory<typeof IconButton2> = () => {
  return (
    <Flex gap={2}>
      <IconButton2>
        <CrossIcon fill="currentColor" />
      </IconButton2>
      <IconButton2 variant="setByDefault">
        <CrossIcon fill="currentColor" />
      </IconButton2>
      <IconButton2 variant="set">
        <CrossIcon fill="currentColor" />
      </IconButton2>
      <IconButton2 variant="inherited">
        <CrossIcon fill="currentColor" />
      </IconButton2>
      <IconButton2 variant="active">
        <CrossIcon fill="currentColor" />
      </IconButton2>
      <IconButton2 disabled={true}>
        <CrossIcon fill="currentColor" />
      </IconButton2>
    </Flex>
  );
};
