import { ProChip as ProChipComponent } from "./pro-chip";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Pro Chip",
  component: ProChipComponent,
};

export const ProChip = () => (
  <>
    <StorySection title="Labels">
      <StoryGrid horizontal>
        <ProChipComponent>Pro</ProChipComponent>
        <ProChipComponent>PRO</ProChipComponent>
        <ProChipComponent>Upgrade</ProChipComponent>
      </StoryGrid>
    </StorySection>

    <StorySection title="Truncated">
      <StoryGrid css={{ width: 80 }}>
        <ProChipComponent>Very long enterprise plan name</ProChipComponent>
      </StoryGrid>
    </StorySection>
  </>
);
