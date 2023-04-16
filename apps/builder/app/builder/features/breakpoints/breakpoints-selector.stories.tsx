import { StorySection } from "@webstudio-is/design-system";
import { BreakpointsSelector } from "./breakpoints-selector";
import type { Breakpoint, Breakpoints } from "@webstudio-is/project-build";
import { nanoid } from "nanoid";

const createBreakpoints = (breakpoints: Array<Breakpoint>): Breakpoints => {
  const breakpointsMap: [Breakpoint["id"], Breakpoint][] = breakpoints.map(
    (breakpoint) => {
      const id = nanoid();
      return [
        id,
        {
          ...breakpoint,
          id,
        },
      ];
    }
  );
  return new Map(breakpointsMap);
};

export const Story = () => {
  const mixed = createBreakpoints([
    { id: "placeholder", label: "Extra Large", minWidth: 1440 },
    { id: "placeholder", label: "Large", minWidth: 1280 },
    { id: "placeholder", label: "Base" },
    { id: "placeholder", label: "Tablet", maxWidth: 991 },
    { id: "placeholder", label: "Mobile landscape", maxWidth: 767 },
    { id: "placeholder", label: "Mobile portrait", maxWidth: 479 },
  ]);
  const selectedBreakpointMixed = Array.from(mixed.values()).at(2);

  const max = createBreakpoints([
    { id: "placeholder", label: "Base" },
    { id: "placeholder", label: "Tablet", maxWidth: 991 },
    { id: "placeholder", label: "Mobile landscape", maxWidth: 767 },
    { id: "placeholder", label: "Mobile portrait", maxWidth: 479 },
  ]);
  const selectedBreakpointMax = Array.from(max.values()).at(0);

  const min = createBreakpoints([
    { id: "placeholder", label: "Extra Large", minWidth: 1440 },
    { id: "placeholder", label: "Large", minWidth: 1280 },
    { id: "placeholder", label: "Base" },
  ]);
  const selectedBreakpointMin = Array.from(min.values()).at(2);

  if (
    selectedBreakpointMixed === undefined ||
    selectedBreakpointMax === undefined ||
    selectedBreakpointMin === undefined
  ) {
    return null;
  }

  return (
    <>
      <StorySection title="All">
        <BreakpointsSelector
          breakpoints={mixed}
          selectedBreakpoint={selectedBreakpointMixed}
        />
      </StorySection>
      <StorySection title="Max-width">
        <BreakpointsSelector
          breakpoints={max}
          selectedBreakpoint={selectedBreakpointMax}
        />
      </StorySection>
      <StorySection title="Min-width">
        <BreakpointsSelector
          breakpoints={min}
          selectedBreakpoint={selectedBreakpointMin}
        />
      </StorySection>
    </>
  );
};

Story.storyName = "breakpoints-selector";

export default {
  component: Story,
};
