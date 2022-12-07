import type { ComponentStory } from "@storybook/react";
import { CrossIcon } from "@webstudio-is/icons";
import { Flex } from "./flex";
import { IconButton2 } from "./icon-button2";

export default {
  component: IconButton2,
};

export const Normal: ComponentStory<typeof IconButton2> = () => {
  return (
    <Flex direction="column" gap={2}>
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
      </Flex>

      <Flex gap={2}>
        <IconButton2 disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton2>
        <IconButton2 variant="setByDefault" disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton2>
        <IconButton2 variant="set" disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton2>
        <IconButton2 variant="inherited" disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton2>
        {/* disabled and active states not possible together */}
      </Flex>
    </Flex>
  );
};

export const Small: ComponentStory<typeof IconButton2> = () => {
  return (
    <Flex direction="column" gap={2}>
      <Flex gap={2}>
        <IconButton2 size="small">
          <CrossIcon fill="currentColor" />
        </IconButton2>
        <IconButton2 variant="setByDefault" size="small">
          <CrossIcon fill="currentColor" />
        </IconButton2>
        <IconButton2 variant="set" size="small">
          <CrossIcon fill="currentColor" />
        </IconButton2>
        <IconButton2 variant="inherited" size="small">
          <CrossIcon fill="currentColor" />
        </IconButton2>
        <IconButton2 variant="active" size="small">
          <CrossIcon fill="currentColor" />
        </IconButton2>
      </Flex>

      <Flex gap={2}>
        <IconButton2 size="small" disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton2>
        <IconButton2 variant="setByDefault" size="small" disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton2>
        <IconButton2 variant="set" size="small" disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton2>
        <IconButton2 variant="inherited" size="small" disabled={true}>
          <CrossIcon fill="currentColor" />
        </IconButton2>
        {/* disabled and active states not possible together */}
      </Flex>
    </Flex>
  );
};
