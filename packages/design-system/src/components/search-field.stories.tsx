import type { ComponentStory } from "@storybook/react";
import { SearchField } from "./search-field";

export default {
  component: SearchField,
};

export const Empty: ComponentStory<typeof SearchField> = () => {
  return <SearchField />;
};

export const WithInitialValue: ComponentStory<typeof SearchField> = () => {
  return <SearchField value={"somevalue"} title="Search" />;
};
