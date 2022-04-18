import { useState } from "react";
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

type DefaultBreakpoint = {
  label: string;
  isDefault: true;
};

type CustomBreakpoint = {
  label: string;
  maxWidth: number;
};

type Breakpoint = CustomBreakpoint | DefaultBreakpoint;

type EditableBreakpointProps = {
  breakpoint: CustomBreakpoint;
  onChange: (breakpoint: Breakpoint) => void;
};

const EditableBreakpoint = ({
  breakpoint,
  onChange,
}: EditableBreakpointProps) => {
  return (
    <form
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
      onChange={(event) => {
        event.stopPropagation();
        const data = new FormData(event.currentTarget);
        const nextBreakpoint: CustomBreakpoint = {
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
      />
      <TextField
        variant="ghost"
        defaultValue={breakpoint.maxWidth}
        css={{ width: 60 }}
        type="number"
        name="maxWidth"
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

const defaultBreakpoints: Array<Breakpoint> = [
  { label: "Default", isDefault: true },
  { label: "Desktop L", maxWidth: 1920 },
  { label: "Desktop M", maxWidth: 1440 },
  { label: "Desktop S", maxWidth: 1280 },
  { label: "Tablet L", maxWidth: 1024 },
  { label: "Tablet M", maxWidth: 768 },
  { label: "Tablet S", maxWidth: 601 },
  { label: "Phone", maxWidth: 414 },
];

type BreakpointsProps = {
  publish: Publish;
};

export const Breakpoints = ({ publish }: BreakpointsProps) => {
  const [breakpoints] = useState(defaultBreakpoints);
  const [isEditing, setIsEditing] = useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ghost aria-label="Breakpoints">
          Desktop
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {breakpoints.map((breakpoint, index) => {
          if (isEditing) {
            if ("isDefault" in breakpoint) return null;
            return (
              <Flex gap="1" css={{ px: "$2" }} key={index}>
                <EditableBreakpoint
                  breakpoint={breakpoint as CustomBreakpoint}
                  onChange={(breakpoint) => {
                    console.log(breakpoint);
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
                publish<"shortcut", string>({
                  type: "shortcut",
                  payload: "x",
                });
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
