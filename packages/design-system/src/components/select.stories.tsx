import type { StoryFn } from "@storybook/react";
import { GapVerticalIcon } from "@webstudio-is/icons";
import { useState } from "react";
import { NestedIconLabel } from "./nested-icon-label";
import { Select, type SelectOption } from "./select";

export default {
  component: Select,
};

export const Simple: StoryFn<typeof Select> = () => {
  const options = ["Apple", "Banana", "Orange"];
  const [value, setValue] = useState(options[0]);
  return (
    <Select name="fruit" options={options} value={value} onChange={setValue} />
  );
};

export const Placeholder: StoryFn<typeof Select> = () => {
  return (
    <Select
      placeholder="Select fruit"
      options={["Apple", "Banana", "Orange"]}
    />
  );
};

export const Disabled: StoryFn<typeof Select> = () => {
  return <Select disabled options={["Apple", "Banana", "Orange"]} />;
};

export const FullWidth: StoryFn<typeof Select> = () => {
  return (
    <div style={{ width: 200 }}>
      <Select
        name="fruit"
        options={["Apple", "Banana", "Orange Orange Orange Orange Orange"]}
        defaultValue="Apple"
        fullWidth
      />
    </div>
  );
};

export const WithNestedLabelIcon: StoryFn<typeof Select> = () => {
  return (
    <Select
      prefix={
        <NestedIconLabel>
          <GapVerticalIcon />
        </NestedIconLabel>
      }
      name="fruit"
      options={["Apple", "Banana", "Orange"]}
      defaultValue="Apple"
    />
  );
};

export const WithComplexItems: StoryFn<typeof Select> = () => {
  const items = {
    apple: { icon: "🍎" },
    banana: { icon: "🍌" },
    orange: { icon: "🍊" },
    pear: { icon: "🍐" },
    grape: { icon: "🍇" },
  } as const;
  const options = Object.keys(items);
  const [value, setValue] = useState(options[0]);
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

export const WithDescriptions: StoryFn<typeof Select> = () => {
  const options = [
    { label: "Apple", description: "An apple fruit" },
    { label: "Banana", description: "A banana fruit" },
    { label: "Orange", description: "An orange fruit" },
    { label: "Pear", description: "A pear fruit" },
    { label: "Grape", description: "A grape fruit" },
  ];
  const [value, setValue] = useState<(typeof options)[number]>(options[0]);

  return (
    <Select
      name="fruit"
      options={options}
      value={value}
      getValue={(value) => value.label}
      onChange={setValue}
      getLabel={(option) => {
        return option.label;
      }}
      getDescription={(option) => {
        return option.description;
      }}
    />
  );
};

export const Boundaries: StoryFn<typeof Select> = () => {
  const items = Array(100)
    .fill(0)
    .map((_, index) => `Item ${index}`);
  const [value, setValue] = useState(items[0]);
  return (
    <Select name="fruit" options={items} value={value} onChange={setValue} />
  );
};
