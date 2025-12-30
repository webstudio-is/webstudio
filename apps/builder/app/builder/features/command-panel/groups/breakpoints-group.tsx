import {
  CommandGroup,
  CommandGroupHeading,
  CommandItem,
  Text,
  Kbd,
} from "@webstudio-is/design-system";
import { computed } from "nanostores";
import { compareMedia } from "@webstudio-is/css-engine";
import type { Breakpoint } from "@webstudio-is/sdk";
import {
  $breakpoints,
  $selectedBreakpoint,
  $selectedBreakpointId,
} from "~/shared/nano-states";
import { closeCommandPanel, $isCommandPanelOpen } from "../command-state";
import type { BaseOption } from "../shared/types";
import { setCanvasWidth } from "~/builder/shared/calc-canvas-width";

export type BreakpointOption = BaseOption & {
  type: "breakpoint";
  breakpoint: Breakpoint;
  keys: string[];
};

export const $breakpointOptions = computed(
  [$isCommandPanelOpen, $breakpoints, $selectedBreakpoint],
  (isOpen, breakpoints, selectedBreakpoint) => {
    if (!isOpen) {
      return [];
    }
    const allBreakpoints = Array.from(breakpoints.values());

    // Separate custom condition breakpoints from width-based
    const customBreakpoints = allBreakpoints.filter(
      (bp) => bp.condition !== undefined
    );
    const widthBasedBreakpoints = allBreakpoints
      .filter((bp) => bp.condition === undefined)
      .sort(compareMedia);

    // Combine with custom conditions at the end
    const sortedBreakpoints = [...widthBasedBreakpoints, ...customBreakpoints];

    const breakpointOptions: BreakpointOption[] = [];
    for (let index = 0; index < sortedBreakpoints.length; index += 1) {
      const breakpoint = sortedBreakpoints[index];
      if (breakpoint.id === selectedBreakpoint?.id) {
        continue;
      }
      const width =
        breakpoint.condition ??
        (breakpoint.minWidth ?? breakpoint.maxWidth)?.toString() ??
        "";
      breakpointOptions.push({
        terms: ["breakpoints", breakpoint.label, width],
        type: "breakpoint",
        breakpoint,
        keys: [(index + 1).toString()],
      });
    }
    return breakpointOptions;
  }
);

const getBreakpointLabel = (breakpoint: Breakpoint) => {
  if (breakpoint.condition) {
    return `${breakpoint.label}: ${breakpoint.condition}`;
  }

  let label = "All Sizes";
  if (breakpoint.minWidth !== undefined) {
    label = `≥ ${breakpoint.minWidth} PX`;
  }
  if (breakpoint.maxWidth !== undefined) {
    label = `≤ ${breakpoint.maxWidth} PX`;
  }
  return `${breakpoint.label}: ${label}`;
};

export const BreakpointsGroup = ({
  options,
}: {
  options: BreakpointOption[];
}) => {
  return (
    <CommandGroup
      name="breakpoint"
      heading={
        <CommandGroupHeading>
          Breakpoints ({options.length})
        </CommandGroupHeading>
      }
      actions={[{ name: "select", label: "Select" }]}
    >
      {options.map(({ breakpoint, keys }) => (
        <CommandItem
          key={breakpoint.id}
          // preserve selected state when rerender
          value={breakpoint.id}
          onSelect={() => {
            closeCommandPanel({ restoreFocus: true });
            $selectedBreakpointId.set(breakpoint.id);
            setCanvasWidth(breakpoint.id);
          }}
        >
          <Text>{getBreakpointLabel(breakpoint)}</Text>
          <Kbd value={keys} />
        </CommandItem>
      ))}
    </CommandGroup>
  );
};
