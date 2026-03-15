import { useState } from "react";
import { Flex } from "./flex";
import { Text } from "./text";
import { SearchField as SearchFieldComponent } from "./search-field";
import { StorySection } from "./storybook";

export default {
  title: "Search field",
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

export const WithAbortCallback = () => {
  const [log, setLog] = useState<string[]>([]);
  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-4), msg]);
  return (
    <Flex direction="column" gap="3" style={{ width: 240 }}>
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
  );
};

export const WithErrorColor = () => (
  <Flex direction="column" gap="3" style={{ width: 240 }}>
    <Text variant="labels">Error color</Text>
    <SearchFieldComponent color="error" placeholder="Error state" />
  </Flex>
);

export const SmallSearchField = () => (
  <Flex direction="column" gap="3" style={{ width: 240 }}>
    <Text variant="labels">Size 1</Text>
    <SearchFieldComponent size="1" placeholder="Small search" />
    <Text variant="labels">Size 2 (default)</Text>
    <SearchFieldComponent size="2" placeholder="Default search" />
  </Flex>
);
