import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { CodeText as CodeTextPrimitive } from "./code-text";

export default {
  title: "Components/CodeText",
  component: CodeTextPrimitive,
} as ComponentMeta<typeof CodeTextPrimitive>;

const Template: ComponentStory<typeof CodeTextPrimitive> = (args) => (
  <CodeTextPrimitive {...args} />
);

export const CodeText = Template.bind({});
CodeText.args = {
  children: "alert('Hello World!')",
};
