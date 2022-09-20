import React from "react";
import { ComponentStory } from "@storybook/react";
import { BrushIcon, ChevronDownIcon } from "@webstudio-is/icons";
import { Flex } from "./flex";
import { IconButton } from "./icon-button";
import { TextField } from "./text-field";

export default {
  component: TextField,
};

export const Default: ComponentStory<typeof TextField> = () => {
  return <TextField />;
};

export const NativeProps: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField placeholder="This is a placeholder" />
      <TextField disabled placeholder="This is a disabled placeholder" />
      <TextField type="number" value={25} />
      <TextField readOnly value="Read-only" />
      <TextField disabled value="Disabled" />
    </Flex>
  );
};

export const Sizes: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField size={1} />
      <TextField size={2} />
    </Flex>
  );
};

export const Variants: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField />
      <TextField variant="ghost" />
    </Flex>
  );
};

export const State: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField />
      <TextField state="invalid" />
      <TextField state="valid" />
    </Flex>
  );
};

export const PrefixSuffix: ComponentStory<typeof TextField> = () => {
  return (
    <Flex direction="column" gap={3}>
      <TextField
        prefix={<BrushIcon />}
        suffix={
          <IconButton size={1}>
            <ChevronDownIcon />
          </IconButton>
        }
      />
      <TextField
        state="invalid"
        prefix={<BrushIcon />}
        suffix={
          <IconButton>
            <ChevronDownIcon />
          </IconButton>
        }
      />
      <TextField
        size={2}
        prefix={<BrushIcon />}
        suffix={
          <IconButton size={2}>
            <ChevronDownIcon />
          </IconButton>
        }
      />
      <TextField
        disabled
        prefix={<BrushIcon />}
        suffix={
          <IconButton>
            <ChevronDownIcon />
          </IconButton>
        }
      />
    </Flex>
  );
};
