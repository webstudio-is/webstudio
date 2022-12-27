import type { ComponentStory } from "@storybook/react";
import { Button } from "./button";

export default {
  component: Button,
};

export const Simple: ComponentStory<typeof Button> = () => {
  return <Button>Simple</Button>;
};
