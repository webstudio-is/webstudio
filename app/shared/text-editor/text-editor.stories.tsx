import React from "react";
import type { ComponentStory, ComponentMeta } from "@storybook/react";
import { TextEditor as TextEditorPrimitive } from "./text-editor";
import "./styles.css";

export default {
  title: "Text Editor",
  component: TextEditorPrimitive,
} as ComponentMeta<typeof TextEditorPrimitive>;

const Template: ComponentStory<typeof TextEditorPrimitive> = (args) => (
  <TextEditorPrimitive {...args} />
);

export const TextEditor = Template.bind({});
TextEditor.args = {};
