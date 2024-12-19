import { useState } from "react";
import type { Meta } from "@storybook/react";
import { CodeEditor as CodeEditorComponent } from "./code-editor";

export default {
  title: "Builder/Code Editor",
  component: CodeEditorComponent,
} satisfies Meta;

const initialHtml = `
<div>
  <a href="#">Click me</a>
</div>
<script>
  runMyJavascript()
</script>
`.trim();

export const BaseEditor = () => {
  const [value, setValue] = useState(initialHtml);
  return (
    <CodeEditorComponent
      value={value}
      onChange={setValue}
      onChangeComplete={setValue}
    />
  );
};

export const HtmlEditor = () => {
  const [value, setValue] = useState(initialHtml);
  return (
    <CodeEditorComponent
      value={value}
      onChange={setValue}
      onChangeComplete={setValue}
      lang="html"
    />
  );
};
