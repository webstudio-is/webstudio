import type { Meta, StoryObj } from "@storybook/react";
import { CodeEditor as CodeEditorComponent } from "./code-editor";

export default {
  title: "Builder/CodeEditor",
  component: CodeEditorComponent,
} satisfies Meta;

const variables = new Map([
  ["#1", "formState"],
  ["#2", "formInitial"],
  ["#3", "count"],
  ["#4", "something"],
  ["#5", "else"],
  ["#6", "hello"],
]);

export const CodeEditor: StoryObj = {
  render: () => (
    <>
      <p>Type $ to trigger variables completion</p>
      <label>Editor with variable in the middle</label>
      <CodeEditorComponent
        variables={variables}
        defaultValue={"Default variable is #3"}
        // eslint-disable-next-line no-console
        onChange={(newCode) => console.info(newCode)}
      />
      <div style={{ height: 32 }}></div>
      <label>Editor with variable at the beginning</label>
      <CodeEditorComponent
        variables={variables}
        defaultValue={"#1 comes first and #2 comes second, and last same #1"}
        // eslint-disable-next-line no-console
        onChange={(newCode) => console.info(newCode)}
      />
    </>
  ),
};
