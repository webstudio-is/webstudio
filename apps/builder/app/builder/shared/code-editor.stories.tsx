import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CodeEditor as CodeEditorComponent } from "./code-editor";

export default {
  title: "Builder/Html Editor",
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

const HtmlStory = () => {
  const [value, setValue] = useState(initialHtml);
  return <CodeEditorComponent value={value} onChange={setValue} />;
};

export const CodeEditor: StoryObj = {
  render: () => <HtmlStory />,
};
