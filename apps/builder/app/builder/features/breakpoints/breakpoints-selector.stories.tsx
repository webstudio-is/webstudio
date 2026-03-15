import { StorySection } from "@webstudio-is/design-system";
import { BreakpointsSelector as BreakpointsSelectorComponent } from "./breakpoints-selector";

export const BreakpointsSelector = () => {
  return (
    <StorySection title="Breakpoints Selector">
      <BreakpointsSelectorComponent />
    </StorySection>
  );
};

export default {
  title: "Breakpoints Selector",
  component: BreakpointsSelector,
};
