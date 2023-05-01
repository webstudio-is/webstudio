import { Fragment, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import store from "immerhin";
import type { Breakpoint } from "@webstudio-is/project-build";
import {
  theme,
  Flex,
  PanelTitle,
  Select,
  IconButton,
  InputField,
  Text,
  PopoverSeparator,
  Separator,
  Box,
} from "@webstudio-is/design-system";
import { MinusIcon, PlusIcon } from "@webstudio-is/icons";
import { breakpointsStore } from "~/shared/nano-states";
import { useStore } from "@nanostores/react";
import { groupBreakpoints, isBaseBreakpoint } from "~/shared/breakpoints";
import { z } from "zod";

type BreakpointEditorItemProps = {
  breakpoint: Breakpoint;
  autoFocus?: boolean;
  onChangeComplete: (breakpoint: Breakpoint) => void;
  onDelete: (breakpoint: Breakpoint) => void;
};

const BreakpointFormData = z.object({
  label: z.string(),
  type: z.enum(["minWidth", "maxWidth"]),
  value: z.string().transform(Number),
});

const useHandleChangeComplete = (
  breakpoint: Breakpoint,
  onChangeComplete: (breakpoint: Breakpoint) => void
) => {
  const formRef = useRef<HTMLFormElement>(null);
  const handleChangeComplete = () => {
    const form = formRef.current;
    if (form === null || form.reportValidity() === false) {
      return;
    }
    const parsed = BreakpointFormData.safeParse(
      Object.fromEntries(new FormData(form))
    );
    // Should never be not successful because the html validator should catch it
    if (parsed.success) {
      const newBreakpoint: Breakpoint = {
        id: breakpoint.id,
        label: parsed.data.label,
        [parsed.data.type]: parsed.data.value,
      };
      onChangeComplete(newBreakpoint);
    }
  };
  const handleChangeCompleteRef = useRef(handleChangeComplete);
  handleChangeCompleteRef.current = handleChangeComplete;

  // Handle change when unmounting
  useEffect(() => handleChangeCompleteRef.current, []);

  return { formRef, handleChangeComplete };
};

const BreakpointEditorItem = ({
  breakpoint,
  autoFocus,
  onChangeComplete,
  onDelete,
}: BreakpointEditorItemProps) => {
  const { formRef, handleChangeComplete } = useHandleChangeComplete(
    breakpoint,
    onChangeComplete
  );
  return (
    <Flex gap="2" css={{ mx: theme.spacing[7] }}>
      <form
        ref={formRef}
        onKeyPress={(event) => {
          if (event.key === "Enter") {
            handleChangeComplete();
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          handleChangeComplete();
        }}
        onBlur={handleChangeComplete}
      >
        <Flex direction="column" gap="1">
          <InputField
            type="text"
            defaultValue={breakpoint.minWidth ?? breakpoint.maxWidth ?? 0}
            placeholder="Breakpoint name"
            name="label"
            minLength={1}
            required
            autoFocus={autoFocus}
          />
          <Flex gap="2" css={{ width: theme.spacing[26] }}>
            <Select
              name="type"
              css={{ zIndex: theme.zIndices[1], width: theme.spacing[21] }}
              options={["maxWidth", "minWidth"]}
              getLabel={(option) =>
                option === "maxWidth" ? "Max Width" : "Min Width"
              }
              defaultValue={breakpoint.maxWidth ? "maxWidth" : "minWidth"}
              onChange={handleChangeComplete}
            />
            <InputField
              css={{ flexShrink: 1 }}
              defaultValue={breakpoint.minWidth ?? breakpoint.maxWidth ?? 0}
              type="number"
              name="value"
              min={0}
              required
              suffix={
                <Text
                  variant="unit"
                  color="subtle"
                  align="center"
                  css={{ width: theme.spacing[10] }}
                >
                  PX
                </Text>
              }
            />
          </Flex>
        </Flex>
      </form>
      <IconButton
        onClick={() => {
          onDelete(breakpoint);
        }}
      >
        <MinusIcon />
      </IconButton>
    </Flex>
  );
};

type BreakpointsEditorProps = {
  onDelete: (breakpoint: Breakpoint) => void;
};

export const BreakpointsEditor = ({ onDelete }: BreakpointsEditorProps) => {
  const breakpoints = useStore(breakpointsStore);
  const [addedBreakpoints, setAddedBreakpoints] = useState<Breakpoint[]>([]);
  const initialBreakpointsRef = useRef(
    groupBreakpoints(Array.from(breakpoints.values()))
  );
  const allBreakpoints = [
    ...addedBreakpoints,
    ...initialBreakpointsRef.current.filter(
      (breakpoint) =>
        addedBreakpoints.find((added) => added.id === breakpoint.id) ===
        undefined
    ),
  ].filter((breakpoint) => isBaseBreakpoint(breakpoint) === false);

  const handleChangeComplete = (breakpoint: Breakpoint) => {
    store.createTransaction([breakpointsStore], (breakpoints) => {
      breakpoints.set(breakpoint.id, breakpoint);
    });
  };

  return (
    <Flex direction="column">
      <PanelTitle
        css={{
          px: theme.spacing[7],
        }}
        suffix={
          <IconButton
            onClick={() => {
              const newBreakpoint: Breakpoint = {
                id: nanoid(),
                label: "",
                minWidth: 0,
              };
              setAddedBreakpoints([newBreakpoint, ...addedBreakpoints]);
            }}
          >
            <PlusIcon />
          </IconButton>
        }
      >
        {"Breakpoints"}
      </PanelTitle>
      <Separator />
      <Box css={{ marginTop: theme.spacing[5] }}>
        {allBreakpoints.map((breakpoint, index, all) => {
          return (
            <Fragment key={breakpoint.id}>
              <BreakpointEditorItem
                breakpoint={breakpoint}
                onChangeComplete={handleChangeComplete}
                onDelete={onDelete}
                autoFocus={index === 0}
              />
              {index < all.length - 1 && <PopoverSeparator />}
            </Fragment>
          );
        })}
      </Box>
      {allBreakpoints.length === 0 && (
        <Text css={{ margin: theme.spacing[10] }}>No breakpoints found</Text>
      )}
    </Flex>
  );
};
