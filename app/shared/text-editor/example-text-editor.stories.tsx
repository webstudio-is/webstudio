import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { ExampleTextEditor } from "./example-text-editor";
import "./styles.css";

export default {
  title: "Text Editor",
  component: ExampleTextEditor,
} as ComponentMeta<typeof ExampleTextEditor>;

const Template: ComponentStory<typeof ExampleTextEditor> = (args) => {
  return <ExampleTextEditor {...args} />;
};

export const TextEditor = Template.bind({});
TextEditor.args = {};
