import { useStore } from "@nanostores/react";
import {
  Toolbar,
  ToolbarToggleGroup,
  ToolbarToggleItem,
} from "@webstudio-is/design-system";
import { useRef } from "react";
import { useBreakpoints } from "~/shared/nano-states";
import { selectedBreakpointIdStore } from "~/shared/nano-states/breakpoints";
import { selectedBreakpointStore } from "~/shared/nano-states/breakpoints";
import { groupBreakpoints } from "./group-breakpoints";
import { CascadeIndicator } from "./cascade-indicator";
import { BpStarOffIcon, BpStarOnIcon } from "@webstudio-is/icons";

export const BreakpointsSelector = () => {
  const [breakpoints] = useBreakpoints();
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const ref = useRef(null);
  if (selectedBreakpoint === undefined) {
    return null;
  }
  return (
    <Toolbar>
      <ToolbarToggleGroup
        type="single"
        value={selectedBreakpoint.id}
        onValueChange={(breakpointId: string) => {
          selectedBreakpointIdStore.set(breakpointId);
        }}
        css={{ position: "relative" }}
      >
        {groupBreakpoints(Array.from(breakpoints.values())).map(
          (breakpoint) => {
            return (
              <ToolbarToggleItem
                variant="subtle"
                ref={breakpoint.id === selectedBreakpoint.id ? ref : undefined}
                value={breakpoint.id}
                key={breakpoint.id}
              >
                {breakpoint.minWidth ??
                  breakpoint.maxWidth ??
                  (breakpoint.id === selectedBreakpoint.id ? (
                    <BpStarOnIcon size={22} />
                  ) : (
                    <BpStarOffIcon size={22} />
                  ))}
              </ToolbarToggleItem>
            );
          }
        )}
        <CascadeIndicator buttonRef={ref} />
      </ToolbarToggleGroup>
    </Toolbar>
  );
};
