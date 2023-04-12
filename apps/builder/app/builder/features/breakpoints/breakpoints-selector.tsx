import { useStore } from "@nanostores/react";
import {
  Toolbar,
  ToolbarToggleGroup,
  ToolbarToggleItem,
} from "@webstudio-is/design-system";
import { useCallback, useRef } from "react";
import { CascadeIndicator } from "./cascade-indicator";
import { BpStarOffIcon, BpStarOnIcon } from "@webstudio-is/icons";
import { useSetInitialCanvasWidth } from ".";
import {
  breakpointsStore,
  selectedBreakpointStore,
  selectedBreakpointIdStore,
} from "~/shared/nano-states";
import { groupBreakpoints } from "~/shared/breakpoints";

export const BreakpointsSelector = () => {
  const breakpoints = useStore(breakpointsStore);
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const setInitialCanvasWidth = useSetInitialCanvasWidth();
  const getButtonById = useCallback((id: string) => refs.current.get(id), []);

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
          const nextSelectedBreakpoint = breakpoints.get(breakpointId);
          if (nextSelectedBreakpoint) {
            setInitialCanvasWidth(nextSelectedBreakpoint.id);
          }
        }}
        css={{ position: "relative" }}
      >
        {groupBreakpoints(Array.from(breakpoints.values())).map(
          (breakpoint) => {
            return (
              <ToolbarToggleItem
                variant="subtle"
                ref={(node) => {
                  if (node) {
                    refs.current.set(breakpoint.id, node);
                    return;
                  }
                  refs.current.delete(breakpoint.id);
                }}
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
        <CascadeIndicator getButtonById={getButtonById} />
      </ToolbarToggleGroup>
    </Toolbar>
  );
};
