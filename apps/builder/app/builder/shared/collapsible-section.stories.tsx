import { Flex, Text } from "@webstudio-is/design-system";
import {
  CollapsibleSectionRoot,
  CollapsibleSection,
  CollapsibleSectionWithAddButton,
  CollapsibleProvider,
} from "./collapsible-section";

export default {
  title: "Builder/Shared/Collapsible Section",
  component: CollapsibleSection,
};

export const Demo = () => (
  <Flex direction="column" css={{ width: 240 }}>
    <CollapsibleSectionRoot label="Root section">
      <Text>Content inside a root section.</Text>
    </CollapsibleSectionRoot>

    <CollapsibleSection label="Default section">
      <Text>This section uses persisted open/close state.</Text>
    </CollapsibleSection>

    <CollapsibleSectionWithAddButton
      label="With add button"
      onAdd={() => {}}
      hasItems
    >
      <Text>Section with an add button in the title.</Text>
    </CollapsibleSectionWithAddButton>

    <CollapsibleSectionWithAddButton
      label="Empty (no items)"
      onAdd={() => {}}
      hasItems={false}
    >
      <Text>This won't appear because hasItems is false.</Text>
    </CollapsibleSectionWithAddButton>
  </Flex>
);

export const Accordion = () => (
  <CollapsibleProvider accordion initialOpen="First">
    <Flex direction="column" css={{ width: 240 }}>
      <CollapsibleSection label="First">
        <Text>First section content.</Text>
      </CollapsibleSection>
      <CollapsibleSection label="Second">
        <Text>Second section content.</Text>
      </CollapsibleSection>
      <CollapsibleSection label="Third">
        <Text>Third section content.</Text>
      </CollapsibleSection>
    </Flex>
  </CollapsibleProvider>
);
