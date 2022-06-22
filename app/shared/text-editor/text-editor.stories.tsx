import React from "react";
import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { TextEditor as TextEditorPrimitive } from "./text-editor";
import "./styles.css";
import { $getRoot, $getSelection, type EditorState } from "lexical";
import { publish } from "@webstudio-is/sdk";

export default {
  title: "Text Editor",
  component: TextEditorPrimitive,
} as ComponentMeta<typeof TextEditorPrimitive>;

const Template: ComponentStory<typeof TextEditorPrimitive> = (args) => {
  return (
    <>
      <button
        onClick={() => {
          publish({ type: "insertInlineInstance", payload: "bold" });
        }}
      >
        Bold
      </button>
      <TextEditorPrimitive {...args} />
    </>
  );
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
