import React from "react";
import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { ExampleTextEditor } from "./example-text-editor";
import "./styles.css";
import { $getRoot, $getSelection, type EditorState } from "./lexical";

// When the editor changes, you can get notified via the
// LexicalOnChangePlugin!
const onChange = (editorState: EditorState) => {
  editorState.read(() => {});
};

export default {
  title: "Text Editor",
  component: ExampleTextEditor,
} as ComponentMeta<typeof ExampleTextEditor>;

const Template: ComponentStory<typeof ExampleTextEditor> = (args) => {
  return <ExampleTextEditor {...args} />;
};

export const TextEditor = Template.bind({});
TextEditor.args = {
  onChange,
};
