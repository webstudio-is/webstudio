import type { ComponentStory } from "@storybook/react";
import { GapVerticalIcon } from "@webstudio-is/icons";
import React from "react";
import { NestedIconLabel } from "./nested-icon-label";
import { Select, type SelectOption } from "./select";

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

export const Placeholder: ComponentStory<typeof Select> = () => {
  return (
    <Select
      placeholder="Select fruit"
      options={["Apple", "Banana", "Orange"]}
    />
  );
};

export const Disabled: ComponentStory<typeof Select> = () => {
  return <Select disabled options={["Apple", "Banana", "Orange"]} />;
};

export const FullWidth: ComponentStory<typeof Select> = () => {
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

export const WithNestedLabelIcon: ComponentStory<typeof Select> = () => {
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
    .map((_, index) => `Item ${index}`);
  const [value, setValue] = React.useState(items[0]);
  return (
    <Select name="fruit" options={items} value={value} onChange={setValue} />
  );
};
