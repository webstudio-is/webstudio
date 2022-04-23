import { useState } from "react";
import { type Breakpoint } from "@webstudio-is/sdk";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuArrow,
  DropdownMenuSeparator,
  Button,
  TextField,
  Flex,
  Text,
  Paragraph,
  Box,
} from "~/shared/design-system";
import { type Publish } from "../../shared/canvas-iframe";
import {
  useBreakpoints,
  useSelectedBreakpoint,
} from "../../shared/nano-values";

type EditableBreakpointProps = {
  breakpoint: Breakpoint;
  onChange: (breakpoint: Breakpoint) => void;
};

const EditableBreakpoint = ({
  breakpoint,
  onChange,
  onFocus,
}: EditableBreakpointProps) => {
  return (
    <form
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
      onChange={(event) => {
        event.stopPropagation();
        const data = new FormData(event.currentTarget);
        const nextBreakpoint: Breakpoint = {
          ref: breakpoint.ref,
          label: String(data.get("label")),
          minWidth: Number(data.get("minWidth")),
        };
        onChange(nextBreakpoint);
      }}
      onFocus={onFocus}
    >
      <Flex gap="1" css={{ px: "$3" }}>
        <TextField
          variant="ghost"
          defaultValue={breakpoint.label}
          css={{ width: 120, flexGrow: 1 }}
          name="label"
        />
        <TextField
          variant="ghost"
          defaultValue={breakpoint.minWidth}
          type="number"
          name="minWidth"
          min={0}
        />
      </Flex>
    </form>
  );
};

const Hint = ({ breakpoint }: any) => {
  return (
    <Box css={{ px: "$3" }}>
      <Paragraph css={{ fontSize: "$1" }}>CSS Preview:</Paragraph>
      <Paragraph css={{ fontSize: "$1" }} variant="gray">
        {`@media (min-width: ${breakpoint.minWidth}px)`}
      </Paragraph>
    </Box>
  );
};

const menuItemCss = {
  display: "flex",
  gap: "$3",
  justifyContent: "start",
  flexGrow: 1,
};

type BreakpointsProps = {
  publish: Publish;
};

export const Breakpoints = ({ publish }: BreakpointsProps) => {
  const [breakpoints] = useBreakpoints();
  const [selectedBreakpoint, setSelectedBreakpoint] = useSelectedBreakpoint();
  const [isEditing, setIsEditing] = useState(false);
  const [breakpointHint, setBreakpointHint] = useState(selectedBreakpoint);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button css={{ gap: "$1" }} ghost aria-label="Breakpoints">
          <Text size="1">{selectedBreakpoint.label}</Text>
          <Text size="1" variant="gray">
            {selectedBreakpoint.minWidth}
          </Text>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent css={{ width: 200 }}>
        {breakpoints.map((breakpoint, index) => {
          if (isEditing) {
            if (breakpoint.ref === "default") return null;
            return (
              <EditableBreakpoint
                key={index}
                breakpoint={breakpoint}
                onFocus={() => {
                  setBreakpointHint(breakpoint);
                }}
                onChange={(_breakpoint) => {
                  // @todo
                }}
              />
            );
          }

          return (
            <DropdownMenuItem
              key={index}
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
              <Flex
                align="center"
                justify="between"
                gap="3"
                css={{ flexGrow: 1 }}
              >
                <Text size="1">{breakpoint.label}</Text>
                <Text size="1" variant="gray">
                  {breakpoint.minWidth}
                </Text>
              </Flex>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <Hint breakpoint={breakpointHint} />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          css={{ justifyContent: "center" }}
          onSelect={(event) => {
            event.preventDefault();
            setIsEditing(!isEditing);
          }}
        >
          {isEditing ? "Done" : "Edit"}
        </DropdownMenuItem>
        <DropdownMenuArrow offset={10} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
