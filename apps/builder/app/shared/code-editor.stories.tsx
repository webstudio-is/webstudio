import { useState } from "react";
import { StorySection } from "@webstudio-is/design-system";
import { CodeEditor as CodeEditorComponent } from "./code-editor";

export default {
  title: "Code editor",
  component: CodeEditorComponent,
};

const initialHtml = `
<div>
  <a href="#">Click me</a>
</div>
<script>
  runMyJavascript()
</script>
`.trim();

const BaseEditorDemo = () => {
  const [value, setValue] = useState(initialHtml);
  return (
    <CodeEditorComponent
      value={value}
      onChange={setValue}
      onChangeComplete={setValue}
    />
  );
};

const HtmlEditorDemo = () => {
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

export const CodeEditor = () => (
  <>
    <StorySection title="Base editor">
      <BaseEditorDemo />
    </StorySection>
    <StorySection title="HTML editor">
      <HtmlEditorDemo />
    </StorySection>
  </>
);
