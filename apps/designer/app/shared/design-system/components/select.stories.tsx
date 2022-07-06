import { ComponentStory } from "@storybook/react";
import React from "react";
import { Select, SelectOption } from "apps/designer/app/shared/design-system";

export default {
  component: Select,
};

export const Simple: ComponentStory<typeof Select> = () => {
  const options = ["Apple", "Banana", "Orange"];
  const [value, setValue] = React.useState(options[0]);
  return (
    <Select name="fruit" options={options} value={value} onChange={setValue} />
  );
};

export const Ghost: ComponentStory<typeof Select> = () => {
  return (
    <Select
      name="fruit"
      options={["Apple", "Banana", "Orange"]}
      defaultValue="Apple"
      ghost
    />
  );
};

export const FullWidth: ComponentStory<typeof Select> = () => {
  return (
    <Select
      name="fruit"
      options={["Apple", "Banana", "Orange"]}
      defaultValue="Apple"
      fullWidth
    />
  );
};

export const WithComplexItems: ComponentStory<typeof Select> = () => {
  const items = {
    apple: { icon: "🍎" },
    banana: { icon: "🍌" },
    orange: { icon: "🍊" },
    pear: { icon: "🍐" },
    grape: { icon: "🍇" },
  } as const;
  const options = Object.keys(items);
  const [value, setValue] = React.useState(options[0]);
  const getLabel = (option: SelectOption) =>
    value && option in items
      ? `${items[option as keyof typeof items]?.icon} ${option}`
      : "No fruit selected";
  return (
    <Select
      name="fruit"
      options={options}
      value={value}
      onChange={setValue}
      getLabel={getLabel}
    />
  );
};

export const Boundaries: ComponentStory<typeof Select> = () => {
  const items = Array(100)
    .fill(0)
    .map((_, i) => `Item ${i}`);
  const [value, setValue] = React.useState(items[0]);
  return (
    <Select name="fruit" options={items} value={value} onChange={setValue} />
  );
};
