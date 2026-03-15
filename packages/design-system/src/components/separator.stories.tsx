import { Separator as SeparatorComponent } from "./separator";
import { Flex } from "./flex";
import { Text } from "./text";
import { StorySection } from "./storybook";

export default {
  title: "Separator",
};

export const Separator = () => (
  <>
    <StorySection title="Horizontal (default)">
      <Flex direction="column" gap="2" css={{ width: 200 }}>
        <Text>Above</Text>
        <SeparatorComponent />
        <Text>Below</Text>
      </Flex>
    </StorySection>

    <StorySection title="Vertical">
      <Flex gap="2" align="center" css={{ height: 40 }}>
        <Text>Left</Text>
        <SeparatorComponent orientation="vertical" />
        <Text>Right</Text>
      </Flex>
    </StorySection>

    <StorySection title="Decorative (no semantic role)">
      <Flex direction="column" gap="2" css={{ width: 200 }}>
        <Text>Above</Text>
        <SeparatorComponent decorative />
        <Text>Below (separator has role=none)</Text>
      </Flex>
    </StorySection>
  </>
);
