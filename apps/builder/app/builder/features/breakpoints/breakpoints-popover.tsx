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
  PopoverPortal,
  PopoverContent,
  PopoverTrigger,
  toggleItemStyle,
  MenuCheckedIcon,
  MenuItemIndicator,
  List,
  ListItem,
  MenuItemButton,
  Box,
  PopoverMenuItemContainer,
  PopoverMenuItemRightSlot,
} from "@webstudio-is/design-system";
import { useSubscribe } from "~/shared/pubsub";
import { BreakpointsEditor } from "./breakpoints-editor";
import { BreakpointsPopoverToolbarButton } from "./breakpoints-popover-toolbar-button";
import { WidthInput } from "./width-input";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
  breakpointsStore,
  stylesStore,
  selectedBreakpointIdStore,
  selectedBreakpointStore,
} from "~/shared/nano-states";
import {
  $breakpointsMenuView,
  groupBreakpoints,
  isBaseBreakpoint,
  minCanvasWidth,
} from "~/shared/breakpoints";
import { scaleStore } from "~/builder/shared/nano-states";
import { useSetInitialCanvasWidth } from "./use-set-initial-canvas-width";
import { serverSyncStore } from "~/shared/sync";

export const BreakpointsPopover = () => {
  const view = useStore($breakpointsMenuView);
  const [breakpointToDelete, setBreakpointToDelete] = useState<
    Breakpoint | undefined
  >();
  const breakpoints = useStore(breakpointsStore);
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const scale = useStore(scaleStore);
  const setInitialCanvasWidth = useSetInitialCanvasWidth();

  useSubscribe("clickCanvas", () => {
    $breakpointsMenuView.set(undefined);
  });

  if (selectedBreakpoint === undefined) {
    return null;
  }

  const handleDelete = () => {
    if (breakpointToDelete === undefined) {
      return;
    }
    serverSyncStore.createTransaction(
      [breakpointsStore, stylesStore],
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
      selectedBreakpointIdStore.set(base.id);
      setInitialCanvasWidth(base.id);
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
      <PopoverTrigger aria-label="Show breakpoints" asChild>
        <BreakpointsPopoverToolbarButton
          className={toggleItemStyle({
            css: { gap: theme.spacing[5] },
          })}
        />
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          css={{ zIndex: theme.zIndices[1], padding: 0 }}
          sideOffset={0}
          collisionPadding={4}
          align="start"
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
              <Flex
                css={{ px: theme.spacing[7], paddingTop: theme.spacing[5] }}
                gap="3"
              >
                <WidthInput min={minCanvasWidth} />
                <Flex align="center" gap="2">
                  <Label>Scale</Label>
                  <Button
                    color="neutral"
                    css={{ width: theme.spacing[17] }}
                    tabIndex={-1}
                  >
                    {Math.round(scale)}%
                  </Button>
                </Flex>
              </Flex>
              <PopoverSeparator />
              <List asChild>
                <Flex direction="column" css={{ my: 0, mx: theme.spacing[3] }}>
                  {groupBreakpoints(Array.from(breakpoints.values())).map(
                    (breakpoint, index) => {
                      return (
                        <ListItem
                          asChild
                          onSelect={() => {
                            selectedBreakpointIdStore.set(breakpoint.id);
                            setInitialCanvasWidth(breakpoint.id);
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
              <PopoverMenuItemContainer
                css={{
                  justifyContent: "center",
                  mx: theme.spacing[7],
                  paddingBottom: theme.spacing[5],
                }}
              >
                <Button
                  color="neutral"
                  css={{ flexGrow: 1 }}
                  onClick={(event) => {
                    event.preventDefault();
                    $breakpointsMenuView.set(
                      view === "initial" ? "editor" : "initial"
                    );
                  }}
                >
                  {view === "editor" ? "Done" : "Edit breakpoints"}
                </Button>
              </PopoverMenuItemContainer>
            </>
          )}
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
