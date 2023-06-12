import {
  EnhancedTooltip,
  Toolbar,
  ToolbarToggleGroup,
  ToolbarToggleItem,
} from "@webstudio-is/design-system";
import { useCallback, useRef } from "react";
import { CascadeIndicator } from "./cascade-indicator";
import { BpStarOffIcon, BpStarOnIcon } from "@webstudio-is/icons";
import { useSetInitialCanvasWidth } from ".";
import { selectedBreakpointIdStore } from "~/shared/nano-states";
import { groupBreakpoints, isBaseBreakpoint } from "~/shared/breakpoints";
import type { Breakpoint, Breakpoints } from "@webstudio-is/project-build";

const getTooltipContent = (breakpoint: Breakpoint) => {
  if (isBaseBreakpoint(breakpoint)) {
    return (
      <>
        <strong>Base breakpoint</strong>
        <br />
        <br />
        Base breakpoint styles apply at all breakpoints, unless they are edited
        at a larger or smaller breakpoint. Start you styling here.
      </>
    );
  }
  if (breakpoint.maxWidth !== undefined) {
    return (
      <>
        <strong>{breakpoint.maxWidth}px and down</strong>
        <br />
        <br />
        Styles added here will apply at {breakpoint.maxWidth}px and down, unless
        they are edited at a smaller breakpoint.
      </>
    );
  }
  if (breakpoint.minWidth !== undefined) {
    return (
      <>
        <strong>{breakpoint.minWidth}px and up</strong>
        <br />
        <br />
        Styles added here will apply at {breakpoint.minWidth}px and up, unless
        they are edited at a larger breakpoint.
      </>
    );
  }
};

type BreakpointsSelector = {
  breakpoints: Breakpoints;
  selectedBreakpoint: Breakpoint;
};

export const BreakpointsSelector = ({
  breakpoints,
  selectedBreakpoint,
}: BreakpointsSelector) => {
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const setInitialCanvasWidth = useSetInitialCanvasWidth();
  const getButtonById = useCallback((id: string) => refs.current.get(id), []);

  return (
    <Toolbar>
      <ToolbarToggleGroup
        type="single"
        value={selectedBreakpoint.id}
        onValueChange={(breakpointId: string) => {
          selectedBreakpointIdStore.set(breakpointId);
          setInitialCanvasWidth(breakpointId);
        }}
        css={{ position: "relative" }}
      >
        {groupBreakpoints(Array.from(breakpoints.values())).map(
          (breakpoint) => {
            return (
              <EnhancedTooltip
                key={breakpoint.id}
                content={getTooltipContent(breakpoint)}
                css={{ maxWidth: 220 }}
              >
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
                >
                  {breakpoint.minWidth ??
                    breakpoint.maxWidth ??
                    (breakpoint.id === selectedBreakpoint.id ? (
                      <BpStarOnIcon size={22} />
                    ) : (
                      <BpStarOffIcon size={22} />
                    ))}
                </ToolbarToggleItem>
              </EnhancedTooltip>
            );
          }
        )}
        <CascadeIndicator
          getButtonById={getButtonById}
          selectedBreakpoint={selectedBreakpoint}
          breakpoints={breakpoints}
        />
      </ToolbarToggleGroup>
    </Toolbar>
  );
};
