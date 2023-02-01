import { ComponentStory } from "@storybook/react";
import { DeprecatedText2 } from "./text2";

export default {
  component: DeprecatedText2,
};

export const Regular: ComponentStory<typeof DeprecatedText2> = () => {
  return <DeprecatedText2>Regular text</DeprecatedText2>;
};

export const Label: ComponentStory<typeof DeprecatedText2> = () => {
  return <DeprecatedText2 variant="label">Label text</DeprecatedText2>;
};

export const Tiny: ComponentStory<typeof DeprecatedText2> = () => {
  return <DeprecatedText2 variant="tiny">Tiny text</DeprecatedText2>;
};
export const Title: ComponentStory<typeof DeprecatedText2> = () => {
  return <DeprecatedText2 variant="title">Title text</DeprecatedText2>;
};
export const Mono: ComponentStory<typeof DeprecatedText2> = () => {
  return <DeprecatedText2 variant="mono">Mono text</DeprecatedText2>;
};
export const Unit: ComponentStory<typeof DeprecatedText2> = () => {
  return <DeprecatedText2 variant="unit">Unit text</DeprecatedText2>;
};
export const Truncated: ComponentStory<typeof DeprecatedText2> = () => {
  return (
    <DeprecatedText2 truncate css={{ width: 200 }}>
      Long long text asdf asdf asdfasdf asdfasdf asdfasdfasdfasf
    </DeprecatedText2>
  );
};
