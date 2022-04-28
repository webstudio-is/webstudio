import { useState } from "react";
import { type Breakpoint, sort } from "@webstudio-is/sdk";
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
import { BreakpointsEditor } from "./breakpoints-editor";
import { Preview } from "./preview";
import { ScaleSetting } from "./scale-setting";
import { TriggerButton } from "./trigger-button";
import { WidthSetting } from "./width-setting";
import { useUpdateCanvasWidth } from "./use-update-canvas-width";
import { willRender } from "./will-render";

const BreakpointSelectorItem = ({ breakpoint }: { breakpoint: Breakpoint }) => {
  const [canvasWidth = 0] = useCanvasWidth();
  return (
    <Flex align="center" justify="between" gap="3" css={{ flexGrow: 1 }}>
      <Text size="1">{breakpoint.label}</Text>
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
  const [breakpoints, setBreakpoints] = useBreakpoints();
  const [selectedBreakpoint, setSelectedBreakpoint] = useSelectedBreakpoint();
  const [isEditing, setIsEditing] = useState(false);
  const [breakpointPreview, setBreakpointPreview] =
    useState(selectedBreakpoint);
  useUpdateCanvasWidth();

  if (selectedBreakpoint === undefined) return null;

  return (
    <DropdownMenu>
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
                  publish({
                    type: "selectBreakpoint",
                    payload: breakpoint,
                  });
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
            <ScaleSetting />
            <WidthSetting />
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
