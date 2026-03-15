import { Flex } from "./flex";
import { Text } from "./text";
import { SearchField as SearchFieldComponent } from "./search-field";
import { StorySection } from "./storybook";

export default {
  title: "Search Field",
  component: SearchFieldComponent,
};

export const SearchField = () => (
  <>
    <StorySection title="States">
      <Flex direction="column" gap="3" css={{ width: 240 }}>
        <Text variant="labels">Empty</Text>
        <SearchFieldComponent placeholder="Search…" />
        <Text variant="labels">With value</Text>
        <SearchFieldComponent value="somevalue" title="Search" />
        <Text variant="labels">Auto focus</Text>
        <SearchFieldComponent autoFocus placeholder="Focused on mount" />
        <Text variant="labels">Disabled</Text>
        <SearchFieldComponent disabled placeholder="Disabled" />
      </Flex>
    </StorySection>
  </>
);
