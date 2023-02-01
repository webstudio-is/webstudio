import { textVariants, Text } from "./text";
import { StorySection } from "./storybook";

const variants = Object.keys(textVariants) as (keyof typeof textVariants)[];

const Story = () => (
  <>
    {variants.map((variant) => (
      <StorySection withBorder key={variant} title={variant}>
        <Text variant={variant}>
          The quick brown fox jumps over the lazy dog
        </Text>
      </StorySection>
    ))}
  </>
);
export { Story as Text };

export default {
  title: "Components/Text",
};
