import { useState } from "react";
import { useSubscribe, type Breakpoint } from "@webstudio-is/sdk";
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
import { type Publish } from "../../shared/canvas-iframe";
import {
  useBreakpoints,
  useSelectedBreakpoint,
  useCanvasWidth,
} from "../../shared/nano-values";
import { willRender } from "~/designer/shared/breakpoints";
import { BreakpointsEditor } from "./breakpoints-editor";
import { Preview } from "./preview";
import { ScaleSetting } from "./scale-setting";
import { TriggerButton } from "./trigger-button";
import { WidthSetting } from "./width-setting";
import { sort } from "./sort";
import {
  useSubscribeScaleFromShortcut,
  useSubscribeSelectBreakpointFromShortcut,
} from "./use-subscribe-shortcuts";

type BreakpointSelectorItemProps = {
  breakpoint: Breakpoint;
};

const BreakpointSelectorItem = ({
  breakpoint,
}: BreakpointSelectorItemProps) => {
  const [canvasWidth = 0] = useCanvasWidth();
  return (
    <Flex align="center" justify="between" gap="3" css={{ flexGrow: 1 }}>
      <Text size="1" css={{ flexGrow: 1 }}>
        {breakpoint.label}
      </Text>
      <Text
        size="1"
        variant={willRender(breakpoint, canvasWidth) ? "contrast" : "gray"}
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
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [breakpoints, setBreakpoints] = useBreakpoints();
  const [selectedBreakpoint, setSelectedBreakpoint] = useSelectedBreakpoint();
  const [breakpointPreview, setBreakpointPreview] =
    useState(selectedBreakpoint);
  useSubscribeSelectBreakpointFromShortcut();
  useSubscribeScaleFromShortcut();

  useSubscribe("openBreakpointsMenu", () => {
    setIsOpen(true);
  });

  if (selectedBreakpoint === undefined) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <TriggerButton />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {isEditing ? (
          <BreakpointsEditor breakpoints={breakpoints} publish={publish} />
        ) : (
          sort(breakpoints).map((breakpoint) => {
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
          })
        )}
        {isEditing === false && (
          <>
            <DropdownMenuSeparator />
            <form>
              <ScaleSetting />
              <WidthSetting />
            </form>
            <DropdownMenuSeparator />
            <Preview breakpoint={breakpointPreview} />
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          css={{ justifyContent: "center" }}
          onSelect={(event) => {
            event.preventDefault();
            setIsEditing(!isEditing);
            setBreakpoints(breakpoints);
          }}
        >
          {isEditing ? "Done" : "Edit breakpoints"}
        </DropdownMenuItem>
        <DropdownMenuArrow offset={10} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
