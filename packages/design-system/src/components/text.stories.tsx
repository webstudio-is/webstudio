import { ComponentStory } from "@storybook/react";
import { Text } from "./text";

export default {
  component: Text,
};

export const Regular: ComponentStory<typeof Text> = () => {
  return <Text>Regular text</Text>;
};

export const Label: ComponentStory<typeof Text> = () => {
  return <Text variant="label">Label text</Text>;
};

export const Tiny: ComponentStory<typeof Text> = () => {
  return <Text variant="tiny">Tiny text</Text>;
};
export const Title: ComponentStory<typeof Text> = () => {
  return <Text variant="title">Title text</Text>;
};
export const Mono: ComponentStory<typeof Text> = () => {
  return <Text variant="mono">Mono text</Text>;
};
export const Unit: ComponentStory<typeof Text> = () => {
  return <Text variant="unit">Unit text</Text>;
};
export const Truncated: ComponentStory<typeof Text> = () => {
  return (
    <Text truncate css={{ width: 200 }}>
      Long long text asdf asdf asdfasdf asdfasdf asdfasdfasdfasf
    </Text>
  );
};
