import { useState } from "react";
import { useStore } from "@nanostores/react";
import store from "immerhin";
import type { Breakpoint } from "@webstudio-is/project-build";
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
import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { groupBreakpoints, minCanvasWidth } from "~/shared/breakpoints";
import { scaleStore } from "~/builder/shared/nano-states";

export const BreakpointsPopover = () => {
  const [view, setView] = useState<
    "initial" | "editor" | "confirmation" | undefined
  >();
  const [breakpointToDelete, setBreakpointToDelete] = useState<
    Breakpoint | undefined
  >();
  const breakpoints = useStore(breakpointsStore);
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const scale = useStore(scaleStore);

  useSubscribe("openBreakpointsMenu", () => {
    setView("initial");
  });

  useSubscribe("clickCanvas", () => {
    setView(undefined);
  });

  if (selectedBreakpoint === undefined) {
    return null;
  }

  const handleDelete = () => {
    if (breakpointToDelete === undefined) {
      return;
    }
    store.createTransaction(
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
      selectedBreakpointIdStore.set(undefined);
    }

    setBreakpointToDelete(undefined);
    setView("editor");
  };

  return (
    <Popover
      open={view !== undefined}
      onOpenChange={(isOpen) => {
        setView(isOpen ? "initial" : undefined);
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
          css={{ zIndex: theme.zIndices[1] }}
          sideOffset={0}
          collisionPadding={4}
          align="start"
        >
          {view === "confirmation" && breakpointToDelete && (
            <ConfirmationDialog
              breakpoint={breakpointToDelete}
              onAbort={() => {
                setBreakpointToDelete(undefined);
                setView("editor");
              }}
              onConfirm={handleDelete}
            />
          )}
          {view === "editor" && (
            <BreakpointsEditor
              onDelete={(breakpoint) => {
                setBreakpointToDelete(breakpoint);
                setView("confirmation");
              }}
            />
          )}
          {view === "initial" && (
            <>
              <Flex
                css={{ px: theme.spacing[7], py: theme.spacing[5] }}
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
                              {breakpoint.minWidth ??
                                breakpoint.maxWidth ??
                                breakpoint.label}
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
          {isFeatureEnabled("breakpointsEditor") &&
            (view === "editor" || view === "initial") && (
              <>
                <PopoverSeparator />
                <PopoverMenuItemContainer
                  css={{
                    justifyContent: "center",
                    px: theme.spacing[7],
                  }}
                >
                  <Button
                    color="neutral"
                    css={{ flexGrow: 1 }}
                    onClick={(event) => {
                      event.preventDefault();
                      setView(view === "initial" ? "editor" : "initial");
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
