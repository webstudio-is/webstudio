import { useCallback, useRef } from "react";
import type { Breakpoint } from "@webstudio-is/sdk";
import {
  Flex,
  Text,
  Toolbar,
  ToolbarToggleGroup,
  ToolbarToggleItem,
  Tooltip,
  theme,
} from "@webstudio-is/design-system";
import { AlertIcon, AsteriskIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import { CascadeIndicator } from "./cascade-indicator";
import {
  $selectedBreakpoint,
  $selectedBreakpointId,
  $breakpoints,
} from "~/shared/nano-states";
import { groupBreakpoints, isBaseBreakpoint } from "~/shared/breakpoints";
import { setCanvasWidth } from "../../shared/calc-canvas-width";
import { $canvasWidth } from "~/builder/shared/nano-states";
import { useDebouncedCallback } from "use-debounce";
import { useEffect, useState } from "react";

const getTooltipContent = (breakpoint: Breakpoint) => {
  const conditionText = breakpoint.condition
    ? ` (${breakpoint.condition})`
    : "";

  if (isBaseBreakpoint(breakpoint)) {
    return (
      <Text>
        <Text variant="regularBold">Base{conditionText}</Text>
        <br />
        Styles on Base apply to all viewport sizes unless overwritten by another
        breakpoint. Start your styling here.
      </Text>
    );
  }

  if (breakpoint.condition) {
    return (
      <Text>
        <Text variant="regularBold">{breakpoint.condition}</Text>
        <br />
        Styles on this breakpoint apply when {breakpoint.condition}.
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

// We are testing a specific canvas width using matchMedia to see if a CSS breakpoint would apply.
// This is needed because browser zoom can cause a mismatch between the actual media query and the displayed breakpoint.
const breakpointMatchesMediaQuery = (
  breakpoint?: Breakpoint,
  canvasWidth?: number
) => {
  // Custom condition breakpoints depend on runtime browser/device features (orientation, hover, color-scheme, etc.)
  // rather than canvas width, so there's no width-related zoom mismatch to detect. Returning true prevents the
  // ZoomWarning component from showing false warnings for breakpoints where canvas width is irrelevant.
  if (breakpoint?.condition !== undefined) {
    return true;
  }

  if (
    canvasWidth === undefined ||
    (breakpoint?.minWidth === undefined && breakpoint?.maxWidth === undefined)
  ) {
    // We don't know in this case if there is a mismatch, so we say it's fine.
    return true;
  }

  const iframe = document.createElement("iframe");
  iframe.style.visibility = "hidden";
  iframe.style.top = "-100000px";
  iframe.style.width = `${canvasWidth}px`;
  document.body.appendChild(iframe);
  const queryList = iframe.contentWindow?.matchMedia(
    `(${breakpoint.minWidth ? "min" : "max"}-width: ${canvasWidth}px)`
  );
  // For some reason we don't get the same results if delete the iframe immediately.
  requestAnimationFrame(() => {
    document.body.removeChild(iframe);
  });
  return queryList?.matches ?? false;
};

// When browser zoom is used we can't guarantee that the displayed selected breakpoint is actually matching the media query on the canvas.
// Actual media query will vary unpredictably, sometimes resulting in 1 px difference and we better warn user they are zooming.
const ZoomWarning = () => {
  const [matches, setMatches] = useState(true);
  const setMatchesDebounced = useDebouncedCallback((canvasWidth) => {
    const matches = breakpointMatchesMediaQuery(
      $selectedBreakpoint.get(),
      canvasWidth
    );
    setMatches(matches);
  }, 1000);

  useEffect(() => {
    const unsubscribe = $canvasWidth.listen(setMatchesDebounced);
    return () => {
      unsubscribe();
    };
  });

  if (matches === true) {
    return;
  }

  return (
    <Tooltip
      variant="wrapped"
      content={`Your browser zoom is causing a mismatch between breakpoints and the actual media query on the canvas.`}
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

export const BreakpointsSelector = () => {
  const breakpoints = useStore($breakpoints);
  const selectedBreakpoint = useStore($selectedBreakpoint);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const getButtonById = useCallback((id: string) => refs.current.get(id), []);

  if (selectedBreakpoint === undefined) {
    return;
  }

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
          setCanvasWidth(breakpointId);
        }}
        css={{ position: "relative" }}
      >
        {(() => {
          const grouped = groupBreakpoints(Array.from(breakpoints.values()));

          // Render width-based breakpoints
          return grouped.widthBased.map((breakpoint) => (
            <Tooltip
              key={breakpoint.id}
              content={getTooltipContent(breakpoint)}
              variant="wrapped"
              disableHoverableContent
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
                {breakpoint.minWidth ?? breakpoint.maxWidth ?? (
                  <AsteriskIcon size={22} />
                )}
              </ToolbarToggleItem>
            </Tooltip>
          ));
        })()}
        {selectedBreakpoint.condition === undefined && (
          <CascadeIndicator
            getButtonById={getButtonById}
            selectedBreakpoint={selectedBreakpoint}
            breakpoints={breakpoints}
          />
        )}
      </ToolbarToggleGroup>
      <ZoomWarning />
    </Toolbar>
  );
};
