import { useState } from "react";
import { CodeEditor as CodeEditorComponent } from "./code-editor";

export default {
  title: "Code Editor",
};

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
