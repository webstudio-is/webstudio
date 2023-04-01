import { useEffect, useState } from "react";
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
  DropdownMenuTrigger,
  DropdownMenuItemRightSlot,
} from "@webstudio-is/design-system";
import { useSubscribe } from "~/shared/pubsub";
import { BreakpointsEditor } from "./breakpoints-editor";
import { Preview } from "./preview";
import { ZoomSetting } from "./zoom-setting";
import { TriggerButton } from "./trigger-button";
import { WidthSetting } from "./width-setting";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
  breakpointsContainer,
  stylesStore,
  useBreakpoints,
} from "~/shared/nano-states";
import {
  selectedBreakpointIdStore,
  selectedBreakpointStore,
} from "~/shared/nano-states/breakpoints";
import { compareMedia } from "@webstudio-is/css-engine";
import { isFeatureEnabled } from "@webstudio-is/feature-flags";

export const Breakpoints = () => {
  const [view, setView] = useState<
    "selector" | "editor" | "confirmation" | undefined
  >();
  const [breakpointToDelete, setBreakpointToDelete] = useState<
    Breakpoint | undefined
  >();
  const [breakpoints] = useBreakpoints();
  const selectedBreakpoint = useStore(selectedBreakpointStore);
  const [breakpointPreview, setBreakpointPreview] =
    useState(selectedBreakpoint);

  useEffect(() => {
    setBreakpointPreview(selectedBreakpoint);
  }, [selectedBreakpoint]);

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
      [breakpointsContainer, stylesStore],
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
      <DropdownMenuTrigger asChild>
        <TriggerButton />
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          css={{ zIndex: theme.zIndices[1] }}
          sideOffset={4}
          collisionPadding={4}
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
              {Array.from(breakpoints.values())
                .sort(compareMedia)
                .reverse()
                .map((breakpoint) => {
                  return (
                    <DropdownMenuCheckboxItem
                      checked={breakpoint === selectedBreakpoint}
                      key={breakpoint.id}
                      onMouseEnter={() => {
                        setBreakpointPreview(breakpoint);
                      }}
                      onMouseLeave={() => {
                        setBreakpointPreview(selectedBreakpoint);
                      }}
                      onSelect={() => {
                        selectedBreakpointIdStore.set(breakpoint.id);
                      }}
                    >
                      {breakpoint.label}
                      <DropdownMenuItemRightSlot>
                        {breakpoint.minWidth ?? breakpoint.maxWidth ?? "any"}
                      </DropdownMenuItemRightSlot>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              <DropdownMenuSeparator />
              <form>
                <ZoomSetting />
                <WidthSetting />
              </form>
              <DropdownMenuSeparator />
              <Preview breakpoint={breakpointPreview} />
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
