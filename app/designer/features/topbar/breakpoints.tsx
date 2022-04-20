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
}: EditableBreakpointProps) => {
  const isDefault = breakpoint.maxWidth === -1;
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
          maxWidth: Number(data.get("maxWidth")),
        };
        onChange(nextBreakpoint);
      }}
    >
      <TextField
        variant="ghost"
        defaultValue={breakpoint.label}
        css={{ width: 120 }}
        name="label"
        readOnly={isDefault}
      />
      <TextField
        variant="ghost"
        defaultValue={isDefault ? "∞" : breakpoint.maxWidth}
        css={{ width: 60 }}
        type={isDefault ? "text" : "number"}
        name="maxWidth"
        min={0}
        readOnly={isDefault}
      />
    </form>
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ghost aria-label="Breakpoints">
          {selectedBreakpoint?.label ?? breakpoints[0].label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {breakpoints.map((breakpoint, index) => {
          if (isEditing) {
            return (
              <Flex gap="1" css={{ px: "$2" }} key={index}>
                <EditableBreakpoint
                  breakpoint={breakpoint}
                  onChange={(_breakpoint) => {
                    // @todo
                  }}
                />
              </Flex>
            );
          }

          return (
            <DropdownMenuItem
              key={index}
              css={menuItemCss}
              onSelect={() => {
                publish({
                  type: "selectBreakpoint",
                  payload: breakpoint,
                });
                setSelectedBreakpoint(breakpoint);
              }}
            >
              {breakpoint.label}
            </DropdownMenuItem>
          );
        })}

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
