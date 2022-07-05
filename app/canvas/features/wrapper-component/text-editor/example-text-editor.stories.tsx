import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import { ExampleTextEditor } from "./example-text-editor";

export default {
  title: "Text Editor",
  component: ExampleTextEditor,
} as ComponentMeta<typeof ExampleTextEditor>;

export const TextEditor: ComponentStory<typeof ExampleTextEditor> = (args) => {
  return <ExampleTextEditor {...args} />;
};

TextEditor.args = {
  onChange: action("onChange"),
};
