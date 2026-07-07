import { textVariants, Text as TextComponent } from "./text";
import { StorySection, StoryGrid } from "./storybook";
import { Flex } from "./flex";

const variants = Object.keys(textVariants) as (keyof typeof textVariants)[];

const colors = [
  "main",
  "contrast",
  "subtle",
  "moreSubtle",
  "disabled",
  "success",
  "destructive",
] as const;

export default {
  title: "Text",
};

export const Text = () => (
  <>
    <StorySection title="Variants">
      {variants.map((variant) => (
        <StorySection withBorder key={variant} title={variant}>
          <TextComponent variant={variant}>
            The quick brown fox jumps over the lazy dog
          </TextComponent>
        </StorySection>
      ))}
    </StorySection>

    <StorySection title="Colors">
      <StoryGrid>
        {colors.map((color) => (
          <TextComponent key={color} color={color}>
            {color}
          </TextComponent>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Alignment">
      <Flex direction="column" gap="2" css={{ width: 300 }}>
        <TextComponent align="left">Left aligned</TextComponent>
        <TextComponent align="center">Center aligned</TextComponent>
        <TextComponent align="right">Right aligned</TextComponent>
      </Flex>
    </StorySection>

    <StorySection title="Truncate">
      <Flex direction="column" gap="2" css={{ width: 200 }}>
        <TextComponent truncate>
          This is a very long text that should be truncated at the container
          edge
        </TextComponent>
        <TextComponent>
          This is a very long text that should NOT be truncated and will wrap
        </TextComponent>
      </Flex>
    </StorySection>

    <StorySection title="User select">
      <TextComponent userSelect="none">
        This text cannot be selected (userSelect: none)
      </TextComponent>
    </StorySection>

    <StorySection title="Inline text">
      <TextComponent>
        This is a paragraph with{" "}
        <TextComponent inline color="destructive">
          inline destructive
        </TextComponent>{" "}
        and{" "}
        <TextComponent inline color="success">
          inline success
        </TextComponent>{" "}
        text inside.
      </TextComponent>
    </StorySection>

    <StorySection title="User select text">
      <TextComponent userSelect="text">
        This text can be selected (userSelect: text)
      </TextComponent>
    </StorySection>
  </>
);
