import { ProBadge as ProBadgeComponent } from "./pro-badge";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Pro Badge",
  component: ProBadgeComponent,
};

export const ProBadge = () => (
  <>
    <StorySection title="Labels">
      <StoryGrid horizontal>
        <ProBadgeComponent>Pro</ProBadgeComponent>
        <ProBadgeComponent>Enterprise</ProBadgeComponent>
        <ProBadgeComponent>Upgrade</ProBadgeComponent>
      </StoryGrid>
    </StorySection>
    <StorySection title="Truncated">
      <StoryGrid css={{ width: 80 }}>
        <ProBadgeComponent>Very long enterprise plan name</ProBadgeComponent>
        <ProBadgeComponent>Short</ProBadgeComponent>
      </StoryGrid>
    </StorySection>
  </>
);
