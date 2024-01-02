import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { HtmlEditor as HtmlEditorComponent } from "./html-editor";

export default {
  title: "Builder/Html Editor",
  component: HtmlEditorComponent,
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
  return <HtmlEditorComponent value={value} onChange={setValue} />;
};

export const HtmlEditor: StoryObj = {
  render: () => <HtmlStory />,
};
