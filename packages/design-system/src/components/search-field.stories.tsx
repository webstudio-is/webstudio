import { Flex } from "./flex";
import { Text } from "./text";
import { SearchField } from "./search-field";

export default {
  title: "Search Field",
  component: SearchField,
};

export const SearchField = () => (
  <Flex direction="column" gap="3" css={{ width: 240 }}>
    <Text variant="labels">Empty</Text>
    <SearchField />
    <Text variant="labels">With value</Text>
    <SearchField value="somevalue" title="Search" />
  </Flex>
);
