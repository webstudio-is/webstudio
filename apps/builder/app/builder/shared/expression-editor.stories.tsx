import type { Meta, StoryObj } from "@storybook/react";
import { ExpressionEditor as ExpressionEditorComponent } from "./expression-editor";
import { useState } from "react";

export default {
  title: "Builder/ExpressionEditor",
  component: ExpressionEditorComponent,
} satisfies Meta;

const scope = {
  $ws$dataSource$123: {
    world: "!s fb skffsjdfksjdlkjslkkjlkj sjf lsdjsskljl kjsf",
    hello: [],
    aa: 0,
    b: true,
  },
  $ws$dataSource$321: { my: "god" },
};
const aliases = new Map<string, string>([
  ["$ws$dataSource$123", "Hello world"],
  ["$ws$dataSource$321", "oh"],
]);

const ExpressionStory = () => {
  const [value, setValue] = useState("$ws$dataSource$123.world");
  return (
    <ExpressionEditorComponent
      scope={scope}
      aliases={aliases}
      value={value}
      onChange={setValue}
    />
  );
};

export const ExpressionEditor: StoryObj = {
  render: () => (
    <>
      <p>
        {`Start typing "h" or "o" or press "Tab" to start variables completion`}
      </p>
      <ExpressionStory />
    </>
  ),
};
