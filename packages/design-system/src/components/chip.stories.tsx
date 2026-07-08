import { Chip as ChipComponent } from "./chip";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Chip",
  component: ChipComponent,
};

export const Chip = () => (
  <>
    <StorySection title="Colors">
      <StoryGrid horizontal>
        <ChipComponent>Neutral</ChipComponent>
        <ChipComponent color="green">Green</ChipComponent>
        <ChipComponent color="purple">Purple</ChipComponent>
      </StoryGrid>
    </StorySection>

    <StorySection title="Truncated">
      <StoryGrid css={{ width: 120 }}>
        <ChipComponent>Very long chip label that should truncate</ChipComponent>
      </StoryGrid>
    </StorySection>
  </>
);
