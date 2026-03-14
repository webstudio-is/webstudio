import { SearchField } from "./search-field";

export default {
  title: "Search Field",
  component: SearchField,
};

export const Empty = () => {
  return <SearchField />;
};

export const WithInitialValue = () => {
  return <SearchField value={"somevalue"} title="Search" />;
};
