import type { ComponentStory } from "@storybook/react";
import { Button } from "./button";

export default {
  component: Button,
};

export const Truncate: ComponentStory<typeof Button> = () => {
  return (
    <Button truncate css={{ width: 200 }}>
      Long long text asdf asdf asdfasdf asdfasdf asdfasdfasdfasf
    </Button>
  );
};
