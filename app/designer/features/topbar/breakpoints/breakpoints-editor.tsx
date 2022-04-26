import { useEffect, useState } from "react";
import useDebounce from "react-use/lib/useDebounce";
import { type Breakpoint, sort } from "@webstudio-is/sdk";
import { Button, TextField, Flex, Text } from "~/shared/design-system";
import { PlusIcon, TrashIcon } from "~/shared/icons";
import { type Publish } from "~/designer/shared/canvas-iframe";
import ObjectId from "bson-objectid";

type BreakpointEditorItemProps = {
  breakpoint: Breakpoint;
  onChange: (breakpoint: Breakpoint) => void;
  onDelete: (breakpoint: Breakpoint) => void;
  onFocus: () => void;
};

const BreakpointEditorItem = ({
  breakpoint: initialBreakpoint,
  onFocus,
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
          // @todo if label changed, we want to generate a ref name
          label: String(data.get("label")),
          minWidth: Number(data.get("minWidth")),
        };
        setBreakpoint(nextBreakpoint);
      }}
      onFocus={onFocus}
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
  onSelect: (breakpoint: Breakpoint) => void;
  publish: Publish;
};

export const BreakpointsEditor = ({
  breakpoints: initialBreakpoints,
  onSelect,
  publish,
}: BreakpointsEditorProps) => {
  const [breakpoints, setBreakpoints] = useState(sort(initialBreakpoints));

  useEffect(() => {
    setBreakpoints(initialBreakpoints);
  }, [initialBreakpoints]);

  return (
    <Flex gap="2" direction="column">
      <Flex
        align="center"
        gap="1"
        justify="between"
        css={{ paddingLeft: "$5", paddingRight: "$3" }}
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
            onFocus={() => {
              onSelect(breakpoint);
            }}
            onChange={(breakpoint) => {
              onSelect(breakpoint);
              publish({ type: "breakpointChange", payload: breakpoint });
            }}
            onDelete={(breakpoint) => {
              const nextBreakpoints = [...breakpoints];
              const index = breakpoints.indexOf(breakpoint);
              nextBreakpoints.splice(index, 1);
              setBreakpoints(nextBreakpoints);
              publish({ type: "breakpointDelete", payload: breakpoint });
            }}
          />
        );
      })}
    </Flex>
  );
};
