import { useState } from "react";
import useDebounce from "react-use/lib/useDebounce";
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

type BreakpointEditorItemProps = {
  breakpoint: Breakpoint;
  onChange: (breakpoint: Breakpoint) => void;
  onFocus: () => void;
};

const BreakpointEditorItem = ({
  breakpoint: initialBreakpoint,
  onChange,
  onFocus,
}: BreakpointEditorItemProps) => {
  const [breakpoint, setBreakpoint] = useState(initialBreakpoint);

  useDebounce(
    () => {
      if (breakpoint !== initialBreakpoint) {
        onChange(breakpoint);
      }
    },
    1000,
    [breakpoint]
  );

  return (
    <form
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
      onChange={(event) => {
        event.stopPropagation();
        const data = new FormData(event.currentTarget);
        const nextBreakpoint: Breakpoint = {
          ...breakpoint,
          // @todo if label changed, we want to generate a ref name
          label: String(data.get("label")),
          minWidth: Number(data.get("minWidth")),
        };
        setBreakpoint(nextBreakpoint);
      }}
      onFocus={onFocus}
    >
      <Flex gap="1" css={{ px: "$4" }}>
        <TextField
          variant="ghost"
          defaultValue={breakpoint.label}
          css={{ width: 100, flexGrow: 1 }}
          name="label"
        />
        <TextField
          variant="ghost"
          defaultValue={breakpoint.minWidth}
          type="number"
          name="minWidth"
          min={0}
          css={{ textAlign: "right" }}
        />
      </Flex>
    </form>
  );
};

type BreakpointsEditorProps = {
  breakpoints: Array<Breakpoint>;
  onSelect: (breakpoint: Breakpoint) => void;
  onChange: (breakpoint: Breakpoint) => void;
};

const BreakpointsEditor = ({
  breakpoints,
  onSelect,
  onChange,
}: BreakpointsEditorProps) => {
  return (
    <>
      {breakpoints.map((breakpoint, index) => {
        if (breakpoint.ref === "default") return null;
        return (
          <BreakpointEditorItem
            key={index}
            breakpoint={breakpoint}
            onFocus={() => {
              onSelect(breakpoint);
            }}
            onChange={(breakpoint) => {
              onSelect(breakpoint);
              onChange(breakpoint);
            }}
          />
        );
      })}
    </>
  );
};

const Hint = ({ breakpoint }: { breakpoint: Breakpoint }) => {
  return (
    <Box css={{ px: "$3" }}>
      <Paragraph css={{ fontSize: "$1" }}>CSS Preview:</Paragraph>
      <Paragraph css={{ fontSize: "$1" }} variant="gray">
        {`@media (min-width: ${breakpoint.minWidth}px)`}
      </Paragraph>
    </Box>
  );
};

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
          {selectedBreakpoint.minWidth > 0 && (
            <Text size="1" variant="gray">
              {selectedBreakpoint.minWidth}
            </Text>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent css={{ width: 200 }}>
        {isEditing ? (
          <BreakpointsEditor
            breakpoints={breakpoints}
            onSelect={setBreakpointHint}
            onChange={(breakpoint) => {
              publish({ type: "breakpointChange", payload: breakpoint });
            }}
          />
        ) : (
          breakpoints.map((breakpoint, index) => {
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
                <BreakpointSelectorItem breakpoint={breakpoint} />
              </DropdownMenuItem>
            );
          })
        )}
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
