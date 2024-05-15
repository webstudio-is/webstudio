import { useCallback, useRef, useState } from "react";
import type { Breakpoint, Breakpoints } from "@webstudio-is/sdk";
import {
  EnhancedTooltip,
  Flex,
  Text,
  Toolbar,
  ToolbarToggleGroup,
  ToolbarToggleItem,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { AlertIcon, BpStarOffIcon, BpStarOnIcon } from "@webstudio-is/icons";
import { CascadeIndicator } from "./cascade-indicator";
import { $selectedBreakpointId } from "~/shared/nano-states";
import { groupBreakpoints, isBaseBreakpoint } from "~/shared/breakpoints";
import { setInitialCanvasWidth } from "./use-set-initial-canvas-width";
import { useWindowResizeDebounced } from "~/shared/dom-hooks";

const getTooltipContent = (breakpoint: Breakpoint) => {
  if (isBaseBreakpoint(breakpoint)) {
    return (
      <Text>
        <Text variant="regularBold">Base</Text>
        <br />
        Styles on Base apply to all viewport sizes unless overwritten by another
        breakpoint. Start your styling here.
      </Text>
    );
  }
  if (breakpoint.maxWidth !== undefined) {
    return (
      <Text>
        <Text variant="regularBold">{breakpoint.maxWidth}px and down</Text>
        <br />
        Styles on this breakpoint apply to viewport widths {breakpoint.maxWidth}
        px and down, unless overwritten by a smaller breakpoint.
      </Text>
    );
  }
  if (breakpoint.minWidth !== undefined) {
    return (
      <Text>
        <Text variant="regularBold">{breakpoint.minWidth}px and up</Text>
        <br />
        Styles on this breakpoint apply to viewport widths {breakpoint.minWidth}
        px and up, unless overwritten by a larger breakpoint.
      </Text>
    );
  }
};

// When browser zoom is used we can't guarantee that the displayed selected breakpoint is actually matching the media query on the canvas.
// Actual media query will vary unpredictably, sometimes resulting in 1 px difference and we better warn user they are zooming.
const ZoomWarning = () => {
  const [zoom, setZoom] = useState<number>();

  const updateZoom = () => {
    setZoom(window.outerWidth / window.innerWidth);
  };

  useWindowResizeDebounced(updateZoom);

  if (zoom === undefined) {
    updateZoom();
    return;
  }

  if (zoom === 1) {
    return;
  }

  return (
    <Tooltip
      variant="wrapped"
      content={`Your browser is at ${zoom.toFixed(
        2
      )} zoom level, and this may result in a mismatch between the breakpoints on the left and the actual media query on the canvas.`}
    >
      <Flex
        align="center"
        css={{
          px: theme.spacing[5],
          height: "100%",
          color: theme.colors.backgroundAlertMain,
        }}
      >
        <AlertIcon />
      </Flex>
    </Tooltip>
  );
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
  const getButtonById = useCallback((id: string) => refs.current.get(id), []);

  return (
    <Toolbar>
      <ToolbarToggleGroup
        type="single"
        value={selectedBreakpoint.id}
        onValueChange={(breakpointId: string) => {
          // onValueChange gives empty string when unselected
          // which is not part of breakpoints so do nothing in this case
          if (breakpoints.has(breakpointId) === false) {
            return;
          }
          $selectedBreakpointId.set(breakpointId);
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
                variant="wrapped"
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
      <ZoomWarning />
    </Toolbar>
  );
};
