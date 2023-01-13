import type { ComponentStory } from "@storybook/react";
import { DeprecatedButton } from "./button";

export default {
  component: DeprecatedButton,
};

export const Simple: ComponentStory<typeof DeprecatedButton> = () => {
  return <DeprecatedButton>Simple</DeprecatedButton>;
};
