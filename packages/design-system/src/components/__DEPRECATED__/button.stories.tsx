import type { StoryFn } from "@storybook/react";
import { DeprecatedButton } from "./button";

export default {
  component: DeprecatedButton,
};

export const Simple: StoryFn<typeof DeprecatedButton> = () => {
  return <DeprecatedButton>Simple</DeprecatedButton>;
};
