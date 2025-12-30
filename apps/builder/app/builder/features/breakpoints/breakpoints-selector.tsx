import { useCallback, useEffect, useRef, useState } from "react";
import type { Breakpoint, Breakpoints } from "@webstudio-is/sdk";
import {
  Flex,
  Text,
  Toolbar,
  ToolbarToggleGroup,
  ToolbarToggleItem,
  ToolbarButton,
  Tooltip,
  theme,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  Button,
} from "@webstudio-is/design-system";
import { AlertIcon, AsteriskIcon, EllipsesIcon } from "@webstudio-is/icons";
import { CascadeIndicator } from "./cascade-indicator";
import { BreakpointsEditor } from "./breakpoints-editor";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
  $selectedBreakpoint,
  $selectedBreakpointId,
  $breakpoints,
  $styles,
} from "~/shared/nano-states";
import { groupBreakpoints, isBaseBreakpoint } from "~/shared/breakpoints";
import { setCanvasWidth } from "../../shared/calc-canvas-width";
import { $canvasWidth } from "~/builder/shared/nano-states";
import { useDebouncedCallback } from "use-debounce";
import { serverSyncStore } from "~/shared/sync/sync-stores";

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
  const [editorOpen, setEditorOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [breakpointToDelete, setBreakpointToDelete] = useState<
    Breakpoint | undefined
  >();
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const handleDelete = () => {
    if (breakpointToDelete === undefined) {
      return;
    }
    serverSyncStore.createTransaction(
      [$breakpoints, $styles],
      (breakpoints, styles) => {
        const breakpointId = breakpointToDelete.id;
        breakpoints.delete(breakpointId);
        for (const [styleDeclKey, styleDecl] of styles) {
          if (styleDecl.breakpointId === breakpointId) {
            styles.delete(styleDeclKey);
          }
        }
      }
    );

    if (breakpointToDelete.id === selectedBreakpoint.id) {
      const breakpointsArray = Array.from(breakpoints.values());
      const base =
        breakpointsArray.find(isBaseBreakpoint) ?? breakpointsArray[0];
      $selectedBreakpointId.set(base.id);
      setCanvasWidth(base.id);
    }
    setBreakpointToDelete(undefined);
    setConfirmationOpen(false);
  };

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
      {(() => {
        const grouped = groupBreakpoints(Array.from(breakpoints.values()));
        const selectedCustom = grouped.custom.find(
          (bp) => bp.id === selectedBreakpoint.id
        );
        return (
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <ToolbarButton
                variant="subtle"
                aria-label="Breakpoints with custom conditions"
                data-state={selectedCustom ? "on" : "off"}
              >
                {selectedCustom ? selectedCustom.label : <EllipsesIcon />}
              </ToolbarButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent css={{ width: theme.spacing[30] }}>
              {grouped.custom.map((breakpoint) => (
                <DropdownMenuCheckboxItem
                  key={breakpoint.id}
                  checked={breakpoint.id === selectedBreakpoint.id}
                  onSelect={() => {
                    $selectedBreakpointId.set(breakpoint.id);
                    setCanvasWidth(breakpoint.id);
                  }}
                >
                  <Flex justify="between" gap="2">
                    <Text truncate css={{ flexBasis: "50%" }}>
                      {breakpoint.label}
                    </Text>
                    <Text color="subtle" truncate>
                      {breakpoint.condition}
                    </Text>
                  </Flex>
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />

              <Flex
                align="center"
                justify="center"
                css={{ padding: theme.panel.padding }}
              >
                <Button
                  color="neutral"
                  onClick={() => {
                    setDropdownOpen(false);
                    setEditorOpen(true);
                  }}
                  css={{ width: "100%" }}
                >
                  Edit breakpoints{" "}
                </Button>
              </Flex>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })()}
      <ZoomWarning />
      <BreakpointsEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onDelete={(breakpoint) => {
          setBreakpointToDelete(breakpoint);
          setEditorOpen(false);
          setConfirmationOpen(true);
        }}
      >
        <div style={{ height: "100%", width: 0 }} />
      </BreakpointsEditor>
      {breakpointToDelete && (
        <ConfirmationDialog
          open={confirmationOpen}
          breakpoint={breakpointToDelete}
          onAbort={() => {
            setBreakpointToDelete(undefined);
            setConfirmationOpen(false);
            setEditorOpen(true);
          }}
          onConfirm={handleDelete}
        />
      )}
    </Toolbar>
  );
};
