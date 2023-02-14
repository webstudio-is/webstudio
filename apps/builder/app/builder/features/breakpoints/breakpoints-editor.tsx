import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { nanoid } from "nanoid";
import store from "immerhin";
import type { Breakpoint } from "@webstudio-is/css-data";
import {
  Button,
  TextField,
  Flex,
  DeprecatedText2,
} from "@webstudio-is/design-system";
import { PlusIcon, TrashIcon } from "@webstudio-is/icons";
import { breakpointsContainer, useBreakpoints } from "~/shared/nano-states";
import { replaceByOrAppendMutable } from "~/shared/array-utils";
import { theme } from "@webstudio-is/design-system";

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
        css={{ paddingLeft: theme.spacing[10], paddingRight: theme.spacing[9] }}
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
          color="ghost"
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
  onDelete: (breakpoint: Breakpoint) => void;
};

export const BreakpointsEditor = ({ onDelete }: BreakpointsEditorProps) => {
  const [breakpoints] = useBreakpoints();
  const [addedBreakpoints, setAddedBreakpoints] = useState<Breakpoint[]>([]);
  const storedBreakpoints = new Set<string>();
  for (const breakpoint of breakpoints) {
    storedBreakpoints.add(breakpoint.id);
  }
  // filter out new breakpoints which are already store
  // instead of deleting from state to avoid the case
  // when both states do not have such breakpoint
  // and focused input remounts
  const newBreakpoints = addedBreakpoints.filter(
    (breakpoint) => storedBreakpoints.has(breakpoint.id) === false
  );
  return (
    <Flex gap="2" direction="column">
      <Flex
        align="center"
        gap="1"
        justify="between"
        css={{
          paddingLeft: theme.spacing[11],
          paddingRight: theme.spacing[9],
          py: theme.spacing[3],
        }}
      >
        <DeprecatedText2>Breakpoints</DeprecatedText2>
        <Button
          color="ghost"
          onClick={() => {
            setAddedBreakpoints((prev) => [
              ...prev,
              {
                id: nanoid(),
                label: "",
                minWidth: 0,
              },
            ]);
          }}
          prefix={<PlusIcon />}
        />
      </Flex>
      {[...breakpoints, ...newBreakpoints].map((breakpoint) => {
        return (
          <BreakpointEditorItem
            key={breakpoint.id}
            breakpoint={breakpoint}
            onChange={(updatedBreakpoint) => {
              store.createTransaction([breakpointsContainer], (breakpoints) => {
                replaceByOrAppendMutable(
                  breakpoints,
                  updatedBreakpoint,
                  ({ id }) => id === updatedBreakpoint.id
                );
              });
            }}
            onDelete={onDelete}
          />
        );
      })}
    </Flex>
  );
};
