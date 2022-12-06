import { expect } from "@storybook/jest";
import type { ComponentStory } from "@storybook/react";
import { userEvent, waitFor, within } from "@storybook/testing-library";
import { HamburgerMenuIcon } from "@webstudio-is/icons";
import { Flex } from "./flex";
import { IconButton } from "./icon-button";

export default {
  component: IconButton,
  argTypes: {
    onFocus: { action: true },
    onBlur: { action: true },
  },
};

export const Size1: ComponentStory<typeof IconButton> = (args) => {
  return (
    <Flex gap={3}>
      <IconButton size="1" aria-label="first button" {...args}>
        <HamburgerMenuIcon />
      </IconButton>

      <IconButton size="1" aria-label="second button" {...args}>
        <HamburgerMenuIcon />
      </IconButton>
    </Flex>
  );
};

export const Size2: ComponentStory<typeof IconButton> = (args) => {
  return (
    <Flex gap={3}>
      <IconButton size="2" aria-label="first button" {...args}>
        <HamburgerMenuIcon />
      </IconButton>

      <IconButton size="2" aria-label="second button" {...args}>
        <HamburgerMenuIcon />
      </IconButton>
    </Flex>
  );
};

Size1.play = Size2.play = async ({ args, canvasElement }) => {
  const canvas = within(canvasElement);
  await userEvent.tab();
  await waitFor(() =>
    expect(canvas.getByLabelText("first button")).toHaveFocus()
  );
  await userEvent.tab();
  await waitFor(() =>
    expect(canvas.getByLabelText("second button")).toHaveFocus()
  );

  await waitFor(() => expect(args.onFocus).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(args.onBlur).toHaveBeenCalledTimes(1));
};
