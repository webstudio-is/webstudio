import { expect } from "@storybook/jest";
import { type ComponentStory } from "@storybook/react";
import { userEvent, waitFor, within } from "@storybook/testing-library";
import React from "react";
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

let updateValue: (value: string) => void;

export const UpdateValue: ComponentStory<typeof SearchField> = () => {
  const [value, setValue] = React.useState("something");
  updateValue = setValue;
  return <SearchField value={value} title="Search" />;
};

UpdateValue.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const search = canvas.getByTitle<HTMLInputElement>("Search");
  expect(search.value).toBe("something");
  updateValue?.("test");
  await waitFor(() => expect(search.value).toBe("test"));
};

export const Reset: ComponentStory<typeof SearchField> = () => {
  return <SearchField value="something" title="Search" />;
};

Reset.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const search = canvas.getByTitle<HTMLInputElement>("Search");
  await userEvent.click(canvas.getByTitle("Reset search"));
  await waitFor(() => expect(search.value).toBe(""));
  expect(await canvas.queryByTitle("Reset search")).toBeNull();
};
