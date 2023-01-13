import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { type Breakpoint } from "@webstudio-is/css-data";
import { type Publish } from "~/shared/pubsub";
import { Button, TextField, Flex, Text } from "@webstudio-is/design-system";
import { PlusIcon, TrashIcon } from "@webstudio-is/icons";
import ObjectId from "bson-objectid";
import { useBreakpoints } from "~/shared/nano-states";

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

  const handleChangeBreakpointDebounced = useDebouncedCallback(
    (nextBreakpoint: Breakpoint) => {
      if (nextBreakpoint !== initialBreakpoint) {
        onChange(nextBreakpoint);
      }
    },
    500
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
        handleChangeBreakpointDebounced(nextBreakpoint);
      }}
    >
      <Flex
        gap="1"
        css={{ paddingLeft: "$spacing$10", paddingRight: "$spacing$9" }}
      >
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
          variant="ghost"
          onClick={() => {
            onDelete(breakpoint);
          }}
          prefix={<TrashIcon />}
        />
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
        css={{
          paddingLeft: "$spacing$11",
          paddingRight: "$spacing$9",
          py: "$spacing$3",
        }}
      >
        <Text>Breakpoints</Text>
        <Button
          variant="ghost"
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
          prefix={<PlusIcon />}
        />
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
