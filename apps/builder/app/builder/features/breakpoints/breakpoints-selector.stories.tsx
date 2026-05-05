import { StorySection } from "@webstudio-is/design-system";
import { BreakpointsSelector as BreakpointsSelectorComponent } from "./breakpoints-selector";
import { $breakpoints } from "~/shared/sync/data-stores";
import { $selectedBreakpointId } from "~/shared/nano-states/breakpoints";

const breakpointsMap = new Map([
  ["1", { id: "1", label: "Mobile", maxWidth: 479 }],
  ["2", { id: "2", label: "Tablet", maxWidth: 991 }],
  ["3", { id: "3", label: "" }],
  ["4", { id: "4", label: "Desktop", minWidth: 1280 }],
  ["5", { id: "5", label: "Wide", minWidth: 1440 }],
]);

$breakpoints.set(breakpointsMap);
$selectedBreakpointId.set("3");

export const BreakpointsSelector = () => {
  return (
    <StorySection title="Breakpoints selector">
      <BreakpointsSelectorComponent />
    </StorySection>
  );
};

export default {
  title: "Breakpoints selector",
  component: BreakpointsSelector,
};
