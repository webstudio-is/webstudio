import { useState } from "react";
import { useStore } from "@nanostores/react";
import type { Breakpoint } from "@webstudio-is/sdk";
import {
  theme,
  PopoverSeparator,
  Flex,
  Label,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  MenuCheckedIcon,
  MenuItemIndicator,
  List,
  ListItem,
  MenuItemButton,
  Box,
  PopoverMenuItemRightSlot,
  Tooltip,
  InputField,
} from "@webstudio-is/design-system";
import { BreakpointsEditor } from "./breakpoints-editor";
import { BreakpointsPopoverToolbarButton } from "./breakpoints-popover-toolbar-button";
import { WidthInput } from "./width-input";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
  $breakpoints,
  $styles,
  $selectedBreakpointId,
  $selectedBreakpoint,
  $isContentMode,
} from "~/shared/nano-states";
import {
  $breakpointsMenuView,
  groupBreakpoints,
  isBaseBreakpoint,
  minCanvasWidth,
} from "~/shared/breakpoints";
import { $scale } from "~/builder/shared/nano-states";
import { setCanvasWidth } from "./use-set-initial-canvas-width";
import { serverSyncStore } from "~/shared/sync";

export const BreakpointsPopover = () => {
  const view = useStore($breakpointsMenuView);
  const [breakpointToDelete, setBreakpointToDelete] = useState<
    Breakpoint | undefined
  >();
  const breakpoints = useStore($breakpoints);
  const selectedBreakpoint = useStore($selectedBreakpoint);
  const scale = useStore($scale);
  const isContentMode = useStore($isContentMode);

  if (selectedBreakpoint === undefined) {
    return null;
  }

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
    $breakpointsMenuView.set("editor");
  };

  return (
    <Popover
      open={view !== undefined}
      onOpenChange={(isOpen) => {
        $breakpointsMenuView.set(isOpen ? "initial" : undefined);
      }}
    >
      <Tooltip content="Breakpoints">
        <PopoverTrigger aria-label="Breakpoints" asChild>
          <BreakpointsPopoverToolbarButton css={{ gap: theme.spacing[5] }} />
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        sideOffset={0}
        collisionPadding={4}
        align="start"
        css={{ width: theme.spacing[30] }}
      >
        {view === "confirmation" && breakpointToDelete && (
          <ConfirmationDialog
            breakpoint={breakpointToDelete}
            onAbort={() => {
              setBreakpointToDelete(undefined);
              $breakpointsMenuView.set("editor");
            }}
            onConfirm={handleDelete}
          />
        )}
        {view === "editor" && (
          <BreakpointsEditor
            onDelete={(breakpoint) => {
              setBreakpointToDelete(breakpoint);
              $breakpointsMenuView.set("confirmation");
            }}
          />
        )}
        {view === "initial" && (
          <>
            <Flex css={{ padding: theme.panel.padding }} gap="3">
              <WidthInput min={minCanvasWidth} />
              <Flex align="center" gap="2">
                <Label>Scale</Label>
                <InputField
                  value={`${Math.round(scale)}%`}
                  tabIndex={-1}
                  readOnly
                />
              </Flex>
            </Flex>
            <PopoverSeparator />
            <List asChild>
              <Flex
                direction="column"
                css={{ px: theme.spacing[3], py: theme.spacing[5] }}
              >
                {groupBreakpoints(Array.from(breakpoints.values())).map(
                  (breakpoint, index) => {
                    return (
                      <ListItem
                        asChild
                        onSelect={() => {
                          $selectedBreakpointId.set(breakpoint.id);
                          setCanvasWidth(breakpoint.id);
                        }}
                        index={index}
                        key={breakpoint.id}
                      >
                        <MenuItemButton withIndicator>
                          {breakpoint === selectedBreakpoint && (
                            <MenuItemIndicator>
                              <MenuCheckedIcon />
                            </MenuItemIndicator>
                          )}
                          <Box
                            css={{ flexGrow: 1, textAlign: "left" }}
                            as="span"
                          >
                            {breakpoint.label}
                          </Box>
                          <PopoverMenuItemRightSlot
                            css={{ color: theme.colors.foregroundSubtle }}
                          >
                            {breakpoint.minWidth !== undefined
                              ? `≥ ${breakpoint.minWidth} PX`
                              : breakpoint.maxWidth !== undefined
                                ? `≤ ${breakpoint.maxWidth} PX`
                                : "All Sizes"}
                          </PopoverMenuItemRightSlot>
                        </MenuItemButton>
                      </ListItem>
                    );
                  }
                )}
              </Flex>
            </List>
          </>
        )}
        {(view === "editor" || view === "initial") && (
          <>
            <PopoverSeparator />
            <Flex
              css={{
                justifyContent: "center",
                padding: theme.spacing[5],
              }}
            >
              <Tooltip
                content={
                  isContentMode
                    ? "Editing is not allowed in content mode"
                    : undefined
                }
              >
                <Button
                  color="neutral"
                  css={{ flexGrow: 1 }}
                  disabled={isContentMode}
                  onClick={(event) => {
                    event.preventDefault();
                    $breakpointsMenuView.set(
                      view === "initial" ? "editor" : "initial"
                    );
                  }}
                >
                  {view === "editor" ? "Done" : "Edit breakpoints"}
                </Button>
              </Tooltip>
            </Flex>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
