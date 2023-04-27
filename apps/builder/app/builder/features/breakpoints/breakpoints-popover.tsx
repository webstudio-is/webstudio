import { useState } from "react";
import { useStore } from "@nanostores/react";
import store from "immerhin";
import type { Breakpoint } from "@webstudio-is/project-build";
import {
  theme,
  DropdownMenuItem,
  PopoverSeparator,
  Flex,
  Label,
  Button,
  Popover,
  PopoverPortal,
  PopoverContent,
  PopoverMenuItemContainer,
  PopoverMenuItemRightSlot,
  MenuItemButton,
  Box,
  PopoverTrigger,
  toggleItemStyle,
  MenuCheckedIcon,
  MenuItemIndicator,
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
    "selector" | "editor" | "confirmation" | undefined
  >();
  const [breakpointToDelete, setBreakpointToDelete] = useState<
    Breakpoint | undefined
  >();
  const breakpoints = useStore(breakpointsStore);
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const scale = useStore(scaleStore);

  useSubscribe("openBreakpointsMenu", () => {
    setView("selector");
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
        setView(isOpen ? "selector" : undefined);
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
            <>
              <BreakpointsEditor
                onDelete={(breakpoint) => {
                  setBreakpointToDelete(breakpoint);
                  setView("confirmation");
                }}
              />
              <PopoverSeparator />
              <DropdownMenuItem
                css={{ justifyContent: "center" }}
                onSelect={(event) => {
                  event.preventDefault();
                  setView("selector");
                }}
              >
                {"Done"}
              </DropdownMenuItem>
            </>
          )}
          {view === "selector" && (
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

              {groupBreakpoints(Array.from(breakpoints.values())).map(
                (breakpoint) => {
                  return (
                    <PopoverMenuItemContainer
                      key={breakpoint.id}
                      onSelect={() => {
                        selectedBreakpointIdStore.set(breakpoint.id);
                      }}
                      css={{ gap: theme.spacing[10] }}
                    >
                      <MenuItemButton withIndicator>
                        {breakpoint === selectedBreakpoint && (
                          <MenuItemIndicator>
                            <MenuCheckedIcon />
                          </MenuItemIndicator>
                        )}
                        <Box css={{ flexGrow: 1, textAlign: "left" }} as="span">
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
                    </PopoverMenuItemContainer>
                  );
                }
              )}
              {isFeatureEnabled("breakpointsEditor") && (
                <>
                  <PopoverSeparator />
                  <PopoverMenuItemContainer
                    css={{
                      justifyContent: "center",
                      px: theme.spacing[7],
                    }}
                    onSelect={(event) => {
                      event.preventDefault();
                      setView("editor");
                    }}
                  >
                    <Button color="neutral" css={{ flexGrow: 1 }}>
                      Edit breakpoints
                    </Button>
                  </PopoverMenuItemContainer>
                </>
              )}
            </>
          )}
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
};
