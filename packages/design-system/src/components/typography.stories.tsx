import { typography } from "./typography";
import { StorySection } from "./storybook";

export const Typography = () => (
  <>
    {Object.entries(typography).map(([key, value]) => (
      <StorySection withBorder key={key} title={key}>
        <div className={value()}>
          The quick brown fox jumps over the lazy dog
        </div>
      </StorySection>
    ))}
  </>
);

export default {
  title: "Components/Typography",
  component: Typography,
};
