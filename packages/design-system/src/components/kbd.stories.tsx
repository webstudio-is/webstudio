import { Kbd as KbdComponent } from "./kbd";
import { Flex } from "./flex";
import { Text } from "./text";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Kbd",
};

export const Kbd = () => (
  <>
    <StorySection title="Colors">
      <StoryGrid>
        <Flex direction="column" gap="1">
          <Text variant="labels">subtle (default)</Text>
          <KbdComponent value={["meta", "z"]} />
        </Flex>
        <Flex direction="column" gap="1">
          <Text variant="labels">moreSubtle</Text>
          <KbdComponent value={["meta", "z"]} color="moreSubtle" />
        </Flex>
        <Flex direction="column" gap="1">
          <Text variant="labels">contrast</Text>
          <KbdComponent value={["meta", "z"]} color="contrast" />
        </Flex>
      </StoryGrid>
    </StorySection>

    <StorySection title="Variant">
      <StoryGrid>
        <Flex direction="column" gap="1">
          <Text variant="labels">default</Text>
          <KbdComponent value={["meta", "c"]} />
        </Flex>
        <Flex direction="column" gap="1">
          <Text variant="labels">regular</Text>
          <KbdComponent value={["meta", "c"]} variant="regular" />
        </Flex>
      </StoryGrid>
    </StorySection>

    <StorySection title="Key combinations">
      <Flex direction="column" gap="2">
        <Flex gap="3" align="center">
          <Text variant="labels" css={{ width: 120 }}>
            Undo
          </Text>
          <KbdComponent value={["meta", "z"]} />
        </Flex>
        <Flex gap="3" align="center">
          <Text variant="labels" css={{ width: 120 }}>
            Redo
          </Text>
          <KbdComponent value={["meta", "shift", "z"]} />
        </Flex>
        <Flex gap="3" align="center">
          <Text variant="labels" css={{ width: 120 }}>
            Delete
          </Text>
          <KbdComponent value={["backspace"]} />
        </Flex>
        <Flex gap="3" align="center">
          <Text variant="labels" css={{ width: 120 }}>
            Enter
          </Text>
          <KbdComponent value={["enter"]} />
        </Flex>
        <Flex gap="3" align="center">
          <Text variant="labels" css={{ width: 120 }}>
            Tab
          </Text>
          <KbdComponent value={["tab"]} />
        </Flex>
        <Flex gap="3" align="center">
          <Text variant="labels" css={{ width: 120 }}>
            Alt + click
          </Text>
          <KbdComponent value={["alt", "click"]} />
        </Flex>
        <Flex gap="3" align="center">
          <Text variant="labels" css={{ width: 120 }}>
            Click
          </Text>
          <KbdComponent value={["click"]} />
        </Flex>
        <Flex gap="3" align="center">
          <Text variant="labels" css={{ width: 120 }}>
            Single key
          </Text>
          <KbdComponent value={["d"]} />
        </Flex>
      </Flex>
    </StorySection>
  </>
);
