import { useState } from "react";
import { useStore } from "@nanostores/react";
import store from "immerhin";
import type { Breakpoint } from "@webstudio-is/project-build";
import {
  theme,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuItemRightSlot,
  Flex,
  Label,
  Button,
} from "@webstudio-is/design-system";
import { useSubscribe } from "~/shared/pubsub";
import { BreakpointsEditor } from "./breakpoints-editor";
import { TriggerButton } from "./trigger-button";
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

export const BreakpointsSettings = () => {
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
    // @todo this should be a popover instead
    // there is a bunch of accessibility issues here
    <DropdownMenu
      open={view !== undefined}
      onOpenChange={(isOpen) => {
        setView(isOpen ? "selector" : undefined);
      }}
    >
      <TriggerButton />
      <DropdownMenuPortal>
        <DropdownMenuContent
          css={{ zIndex: theme.zIndices[1] }}
          sideOffset={4}
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
              <DropdownMenuSeparator />
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
                direction="row"
              >
                <WidthInput min={minCanvasWidth} />
                <Flex align="center" gap="2">
                  <Label>Scale</Label>
                  <Button color="neutral" css={{ width: theme.spacing[17] }}>
                    {Math.round(scale)}%
                  </Button>
                </Flex>
              </Flex>
              <DropdownMenuSeparator />

              {groupBreakpoints(Array.from(breakpoints.values())).map(
                (breakpoint) => {
                  return (
                    <DropdownMenuCheckboxItem
                      checked={breakpoint === selectedBreakpoint}
                      key={breakpoint.id}
                      onSelect={() => {
                        selectedBreakpointIdStore.set(breakpoint.id);
                      }}
                      css={{ gap: theme.spacing[10] }}
                    >
                      {breakpoint.label}
                      <DropdownMenuItemRightSlot>
                        {breakpoint.minWidth ?? breakpoint.maxWidth ?? "any"}
                      </DropdownMenuItemRightSlot>
                    </DropdownMenuCheckboxItem>
                  );
                }
              )}
              {isFeatureEnabled("breakpointsEditor") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    css={{ justifyContent: "center" }}
                    onSelect={(event) => {
                      event.preventDefault();
                      setView("editor");
                    }}
                  >
                    Edit breakpoints
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
