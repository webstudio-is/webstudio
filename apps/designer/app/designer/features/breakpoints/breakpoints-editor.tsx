import { useState } from "react";
import useDebounce from "react-use/lib/useDebounce";
import { type Breakpoint, type Publish } from "@webstudio-is/sdk";
import {
  Button,
  TextField,
  Flex,
  Text,
} from "apps/designer/app/shared/design-system";
import { PlusIcon, TrashIcon } from "apps/designer/app/shared/icons";
import ObjectId from "bson-objectid";
import { useBreakpoints } from "apps/designer/app/shared/nano-states";

type BreakpointEditorItemProps = {
  breakpoint: Breakpoint;
  onChange: (breakpoint: Breakpoint) => void;
  onDelete: (breakpoint: Breakpoint) => void;
};

const BreakpointEditorItem = ({
  breakpoint: initialBreakpoint,
  onChange,
  onDelete,
}: BreakpointEditorItemProps) => {
  const [breakpoint, setBreakpoint] = useState(initialBreakpoint);

  useDebounce(
    () => {
      if (breakpoint !== initialBreakpoint) {
        onChange(breakpoint);
      }
    },
    500,
    [breakpoint]
  );

  return (
    <form
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
      onChange={(event) => {
        event.stopPropagation();
        const form = event.currentTarget;
        if (form.reportValidity() === false) {
          return;
        }
        const data = new FormData(form);
        const nextBreakpoint: Breakpoint = {
          ...breakpoint,
          label: String(data.get("label")),
          minWidth: Number(data.get("minWidth")),
        };
        setBreakpoint(nextBreakpoint);
      }}
    >
      <Flex gap="1" css={{ paddingLeft: "$4", paddingRight: "$3" }}>
        <TextField
          css={{ width: 100, flexGrow: 1 }}
          type="text"
          variant="ghost"
          defaultValue={breakpoint.label}
          placeholder="Breakpoint name"
          name="label"
          minLength={2}
          required
        />
        <TextField
          css={{ textAlign: "right", width: 50 }}
          variant="ghost"
          defaultValue={breakpoint.minWidth}
          type="number"
          name="minWidth"
          min={0}
          required
        />
        <Button
          type="button"
          ghost
          onClick={() => {
            onDelete(breakpoint);
          }}
        >
          <TrashIcon />
        </Button>
      </Flex>
    </form>
  );
};

type BreakpointsEditorProps = {
  breakpoints: Array<Breakpoint>;
  publish: Publish;
  onDelete: (breakpoint: Breakpoint) => void;
};

export const BreakpointsEditor = ({
  publish,
  onDelete,
}: BreakpointsEditorProps) => {
  const [breakpoints, setBreakpoints] = useBreakpoints();
  return (
    <Flex gap="2" direction="column">
      <Flex
        align="center"
        gap="1"
        justify="between"
        css={{ paddingLeft: "$5", paddingRight: "$3", py: "$1" }}
      >
        <Text>Breakpoints</Text>
        <Button
          ghost
          onClick={() => {
            setBreakpoints([
              ...breakpoints,
              {
                id: ObjectId().toString(),
                label: "",
                minWidth: 0,
              },
            ]);
          }}
        >
          <PlusIcon />
        </Button>
      </Flex>
      {breakpoints.map((breakpoint) => {
        return (
          <BreakpointEditorItem
            key={breakpoint.id}
            breakpoint={breakpoint}
            onChange={(updatedBreakpoint) => {
              publish({ type: "breakpointChange", payload: updatedBreakpoint });
              const nextBreakpoints = breakpoints.map((breakpoint) => {
                if (breakpoint.id === updatedBreakpoint.id) {
                  return updatedBreakpoint;
                }
                return breakpoint;
              });
              setBreakpoints(nextBreakpoints);
            }}
            onDelete={onDelete}
          />
        );
      })}
    </Flex>
  );
};
