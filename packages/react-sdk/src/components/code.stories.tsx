import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { Code as CodePrimitive } from "./code";

export default {
  title: "Components/Code",
  component: CodePrimitive,
} as ComponentMeta<typeof CodePrimitive>;

const Template: ComponentStory<typeof CodePrimitive> = (args) => (
  <CodePrimitive {...args} />
);

export const Code = Template.bind({});
Code.args = {
  children: "alert('Hello World!')",
};
