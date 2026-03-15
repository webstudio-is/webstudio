import { useState } from "react";
import { Flex } from "./flex";
import { Text } from "./text";
import { SearchField as SearchFieldComponent } from "./search-field";
import { StorySection } from "./storybook";

export default {
  title: "Search Field",
  component: SearchFieldComponent,
};

export const SearchField = () => {
  const [log, setLog] = useState<string[]>([]);
  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-4), msg]);

  return (
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

      <StorySection title="With abort callback">
        <Flex direction="column" gap="3" css={{ width: 240 }}>
          <Text variant="labels">Type and click X or press Escape</Text>
          <SearchFieldComponent
            placeholder="Type and clear…"
            onAbort={() => addLog("onAbort fired")}
          />
          {log.map((entry, i) => (
            <Text key={i} variant="mono">
              {entry}
            </Text>
          ))}
        </Flex>
      </StorySection>

      <StorySection title="Error color">
        <Flex direction="column" gap="3" css={{ width: 240 }}>
          <SearchFieldComponent color="error" placeholder="Error state" />
        </Flex>
      </StorySection>

      <StorySection title="Sizes">
        <Flex direction="column" gap="3" css={{ width: 240 }}>
          <Text variant="labels">Size 1</Text>
          <SearchFieldComponent size="1" placeholder="Small search" />
          <Text variant="labels">Size 2 (default)</Text>
          <SearchFieldComponent size="2" placeholder="Default search" />
        </Flex>
      </StorySection>
    </>
  );
};
