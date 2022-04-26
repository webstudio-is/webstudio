import { useState } from "react";
import { type Breakpoint, sort } from "@webstudio-is/sdk";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuArrow,
  DropdownMenuSeparator,
  Text,
  Flex,
} from "~/shared/design-system";
import { type Publish } from "../../shared/canvas-iframe";
import {
  useBreakpoints,
  useSelectedBreakpoint,
} from "../../shared/nano-values";
import { BreakpointsEditor } from "./breakpoints-editor";
import { Hint } from "./hint";
import { Scale } from "./scale";
import { TriggerButton } from "./trigger-button";

const BreakpointSelectorItem = ({ breakpoint }: { breakpoint: Breakpoint }) => (
  <Flex align="center" justify="between" gap="3" css={{ flexGrow: 1 }}>
    <Text size="1">{breakpoint.label}</Text>
    <Text size="1" variant="gray">
      {breakpoint.minWidth}
    </Text>
  </Flex>
);

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
  const [breakpointHint, setBreakpointHint] = useState(selectedBreakpoint);

  if (selectedBreakpoint === undefined) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TriggerButton breakpoint={selectedBreakpoint} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {isEditing ? (
          <BreakpointsEditor breakpoints={breakpoints} publish={publish} />
        ) : (
          sort(breakpoints).map((breakpoint) => {
            return (
              <DropdownMenuItem
                key={breakpoint.id}
                css={menuItemCss}
                onMouseOver={() => {
                  setBreakpointHint(breakpoint);
                }}
                onMouseOut={() => {
                  setBreakpointHint(selectedBreakpoint);
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
              </DropdownMenuItem>
            );
          })
        )}
        {isEditing === false && (
          <>
            <DropdownMenuSeparator />
            <Scale />
            <DropdownMenuSeparator />
            <Hint breakpoint={breakpointHint} />
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
          {isEditing ? "Done" : "Edit"}
        </DropdownMenuItem>
        <DropdownMenuArrow offset={10} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
