import { Flex } from "./flex";
import { Text } from "./text";
import { SearchField as SearchFieldComponent } from "./search-field";

export default {
  title: "Search Field",
  component: SearchFieldComponent,
};

export const SearchField = () => (
  <Flex direction="column" gap="3" css={{ width: 240 }}>
    <Text variant="labels">Empty</Text>
    <SearchFieldComponent />
    <Text variant="labels">With value</Text>
    <SearchFieldComponent value="somevalue" title="Search" />
  </Flex>
);
