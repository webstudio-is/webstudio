import { action } from "@storybook/addon-actions";
import { ComponentStory } from "@storybook/react";
import { Select } from "~/shared/design-system";

export default {
  component: Select,
};

const values = ["Apple", "Banana", "Orange", "Pear", "Grape"];

export const Default: ComponentStory<typeof Select> = (args) => (
  <Select {...args} />
);

Default.args = {
  name: "fruit",
  onChange: action("onChange"),
  value: "Apple",
  options: values,
};
