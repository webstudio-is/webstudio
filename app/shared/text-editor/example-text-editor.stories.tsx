import React from "react";
import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { ExampleTextEditor } from "./example-text-editor";
import "./styles.css";
import { $getRoot, $getSelection, type EditorState } from "lexical";

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

// When the editor changes, you can get notified via the
// LexicalOnChangePlugin!
function onChange(editorState: EditorState) {
  editorState.read(() => {
    // Read the contents of the EditorState here.
    const root = $getRoot();
    const selection = $getSelection();

    console.log(root, selection);
  });
}
