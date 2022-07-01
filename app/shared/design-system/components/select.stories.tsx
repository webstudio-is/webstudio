import React from "react";
import { ComponentStory } from "@storybook/react";
import { Select } from "~/shared/design-system";

export default {
  component: Select,
};

const values = [
  { value: "Apple", label: "Apple" },
  { value: "Banana", label: "Banana" },
  { value: "Orange", label: "Orange" },
  { value: "Pear", label: "Pear" },
  { value: "Grape", label: "Grape" },
];

export const Default: ComponentStory<typeof Select> = () => {
  const [value, setValue] = React.useState();
  return (
    <Select name="fruit" options={values} value={value} onChange={setValue} />
  );
};
