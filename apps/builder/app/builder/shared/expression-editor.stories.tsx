import type { Meta, StoryObj } from "@storybook/react";
import { ExpressionEditor as ExpressionEditorComponent } from "./expression-editor";
import { useState } from "react";

export default {
  title: "Builder/Expression Editor",
  component: ExpressionEditorComponent,
} satisfies Meta;

const scope = {
  $ws$dataSource$123: {
    long: "!s fb skffsjdfksjdlkjslkkjlkj sjf lsdjsskljl kjsf",
    array: [],
    number: 0,
    boolean: true,
    object: { param: "value" },
  },
  $ws$dataSource$321: { my: "god" },
  $ws$dataSource$computed: [
    // 0-11 keys
    { "with space": 0 },
    { "0_numeric": 0 },
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
  ],
};
const aliases = new Map<string, string>([
  ["$ws$dataSource$123", "Hello world"],
  ["$ws$dataSource$321", "oh"],
  ["$ws$dataSource$computed", "computed"],
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
