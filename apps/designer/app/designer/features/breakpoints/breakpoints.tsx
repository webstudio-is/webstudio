import { useEffect, useState } from "react";
import {
  useSubscribe,
  type Breakpoint,
  type Publish,
} from "@webstudio-is/react-sdk";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuArrow,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  Text,
  Flex,
} from "~/shared/design-system";
import { sort } from "~/shared/breakpoints";
import { useSelectedBreakpoint } from "../../shared/nano-states";
import { BreakpointsEditor } from "./breakpoints-editor";
import { Preview } from "./preview";
import { ZoomSetting } from "./zoom-setting";
import { TriggerButton } from "./trigger-button";
import { WidthSetting } from "./width-setting";
import {
  useSubscribeZoomFromShortcut,
  useSubscribeSelectBreakpointFromShortcut,
} from "./use-subscribe-shortcuts";
import { ConfirmationDialog } from "./confirmation-dialog";
import { useBreakpoints } from "~/shared/nano-states";

type BreakpointSelectorItemProps = {
  breakpoint: Breakpoint;
};

const BreakpointSelectorItem = ({
  breakpoint,
}: BreakpointSelectorItemProps) => {
  return (
    <Flex align="center" justify="between" gap="3" css={{ flexGrow: 1 }}>
      <Text size="1" css={{ flexGrow: 1, color: "inherit" }}>
        {breakpoint.label}
      </Text>
      <Text
        size="1"
        css={{
          color: "inherit",
        }}
      >
        {breakpoint.minWidth}
      </Text>
    </Flex>
  );
};
const menuItemCss = {
  display: "flex",
  gap: "$3",
  justifyContent: "start",
  flexGrow: 1,
  minWidth: 180,
};

type BreakpointsProps = {
  publish: Publish;
};

export const Breakpoints = ({ publish }: BreakpointsProps) => {
  const [view, setView] = useState<
    "selector" | "editor" | "confirmation" | undefined
  >();
  const [breakpointToDelete, setBreakpointToDelete] = useState<
    Breakpoint | undefined
  >();
  const [breakpoints, setBreakpoints] = useBreakpoints();
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

  if (selectedBreakpoint === undefined) return null;

  const handleDelete = () => {
    if (breakpointToDelete === undefined) return;
    const nextBreakpoints = [...breakpoints];
    const index = breakpoints.indexOf(breakpointToDelete);
    nextBreakpoints.splice(index, 1);
    setBreakpoints(nextBreakpoints);
    if (breakpointToDelete === selectedBreakpoint) {
      setSelectedBreakpoint(sort(nextBreakpoints)[0]);
    }
    publish({
      type: "breakpointDelete",
      payload: breakpointToDelete,
    });
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
      <DropdownMenuContent>
        {view === "confirmation" && (
          <ConfirmationDialog
            breakpoint={selectedBreakpoint}
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
              breakpoints={breakpoints}
              publish={publish}
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
            {sort(breakpoints).map((breakpoint) => {
              return (
                <DropdownMenuCheckboxItem
                  checked={breakpoint === selectedBreakpoint}
                  key={breakpoint.id}
                  css={menuItemCss}
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
                  <BreakpointSelectorItem breakpoint={breakpoint} />
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
              {"Edit breakpoints"}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuArrow offset={10} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
