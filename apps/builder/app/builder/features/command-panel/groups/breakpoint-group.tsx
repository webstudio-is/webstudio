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
import { setCanvasWidth } from "~/builder/features/breakpoints";
import { closeCommandPanel } from "../command-state";

export type BreakpointOption = {
  terms: string[];
  type: "breakpoint";
  breakpoint: Breakpoint;
  shortcut: string;
};

export const $breakpointOptions = computed(
  [$breakpoints, $selectedBreakpoint],
  (breakpoints, selectedBreakpoint) => {
    const sortedBreakpoints = Array.from(breakpoints.values()).sort(
      compareMedia
    );
    const breakpointOptions: BreakpointOption[] = [];
    for (let index = 0; index < sortedBreakpoints.length; index += 1) {
      const breakpoint = sortedBreakpoints[index];
      if (breakpoint.id === selectedBreakpoint?.id) {
        continue;
      }
      const width =
        (breakpoint.minWidth ?? breakpoint.maxWidth)?.toString() ?? "";
      breakpointOptions.push({
        terms: ["breakpoints", breakpoint.label, width],
        type: "breakpoint",
        breakpoint,
        shortcut: (index + 1).toString(),
      });
    }
    return breakpointOptions;
  }
);

const getBreakpointLabel = (breakpoint: Breakpoint) => {
  let label = "All Sizes";
  if (breakpoint.minWidth !== undefined) {
    label = `≥ ${breakpoint.minWidth} PX`;
  }
  if (breakpoint.maxWidth !== undefined) {
    label = `≤ ${breakpoint.maxWidth} PX`;
  }
  return `${breakpoint.label}: ${label}`;
};

export const BreakpointGroup = ({
  options,
}: {
  options: BreakpointOption[];
}) => {
  return (
    <CommandGroup
      name="breakpoint"
      heading={<CommandGroupHeading>Breakpoints</CommandGroupHeading>}
      actions={["select"]}
    >
      {options.map(({ breakpoint, shortcut }) => (
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
          <Text variant="labelsTitleCase">
            {getBreakpointLabel(breakpoint)}
          </Text>
          <Kbd value={[shortcut]} />
        </CommandItem>
      ))}
    </CommandGroup>
  );
};
