import { useStore } from "@nanostores/react";
import { compareMedia } from "@webstudio-is/css-engine";
import {
  Flex,
  ToolbarToggleGroup,
  ToolbarToggleItem,
} from "@webstudio-is/design-system";
import { useBreakpoints } from "~/shared/nano-states";
import { selectedBreakpointIdStore } from "~/shared/nano-states/breakpoints";
import { selectedBreakpointStore } from "~/shared/nano-states/breakpoints";

export const BreakpointsSelector = () => {
  const [breakpoints] = useBreakpoints();
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  if (selectedBreakpoint === undefined) {
    return null;
  }
  return (
    <Flex>
      <ToolbarToggleGroup
        type="single"
        value={selectedBreakpoint.id}
        onValueChange={(breakpointId: string) => {
          selectedBreakpointIdStore.set(breakpointId);
        }}
      >
        {Array.from(breakpoints.values())
          .sort(compareMedia)
          .reverse()
          .map((breakpoint) => {
            return (
              <ToolbarToggleItem value={breakpoint.id} key={breakpoint.id}>
                {breakpoint.minWidth ?? breakpoint.maxWidth ?? "Base"}
              </ToolbarToggleItem>
            );
          })}
      </ToolbarToggleGroup>
    </Flex>
  );
};
