import { textVariants, Text } from "./text";
import { StorySection } from "./storybook";

const variants = Object.keys(textVariants) as (keyof typeof textVariants)[];

export const Typography = () => (
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

export default {
  title: "Components/Typography",
  component: Typography,
};
