import { useEffect, useState } from "react";
import store from "immerhin";
import { type Breakpoint } from "@webstudio-is/css-data";
import { useSubscribe } from "~/shared/pubsub";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItemRightSlot,
} from "@webstudio-is/design-system";
import { useSelectedBreakpoint } from "../../shared/nano-states";
import { BreakpointsEditor } from "./breakpoints-editor";
import { Preview } from "./preview";
import { ZoomSetting } from "./zoom-setting";
import { TriggerButton } from "./trigger-button";
import { WidthSetting } from "./width-setting";
import {
  useSubscribeSelectBreakpointFromShortcut,
  useSubscribeZoomFromShortcut,
} from "./use-subscribe-shortcuts";
import { ConfirmationDialog } from "./confirmation-dialog";
import {
  breakpointsContainer,
  stylesStore,
  useBreakpoints,
} from "~/shared/nano-states";
import { utils } from "@webstudio-is/project";
import { removeByMutable } from "~/shared/array-utils";
import { theme } from "@webstudio-is/design-system";

export const Breakpoints = () => {
  const [view, setView] = useState<
    "selector" | "editor" | "confirmation" | undefined
  >();
  const [breakpointToDelete, setBreakpointToDelete] = useState<
    Breakpoint | undefined
  >();
  const [breakpoints] = useBreakpoints();
  const [selectedBreakpoint, setSelectedBreakpoint] = useSelectedBreakpoint();
  const [breakpointPreview, setBreakpointPreview] =
    useState(selectedBreakpoint);
  useSubscribeSelectBreakpointFromShortcut();
  useSubscribeZoomFromShortcut();

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
    const [updatedBreakpoints] = store.createTransaction(
      [breakpointsContainer, stylesStore],
      (breakpoints, styles) => {
        removeByMutable(breakpoints, ({ id }) => id === breakpointToDelete.id);
        removeByMutable(
          styles,
          (style) => style.breakpointId === breakpointToDelete.id
        );
      }
    );
    if (breakpointToDelete === selectedBreakpoint) {
      setSelectedBreakpoint(utils.breakpoints.sort(updatedBreakpoints)[0]);
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
              {utils.breakpoints.sort(breakpoints).map((breakpoint) => {
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
                      setSelectedBreakpoint(breakpoint);
                    }}
                  >
                    {breakpoint.label}
                    <DropdownMenuItemRightSlot>
                      {breakpoint.minWidth}
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
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
