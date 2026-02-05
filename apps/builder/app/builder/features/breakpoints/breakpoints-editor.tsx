import { Fragment, useState, useMemo } from "react";
import { nanoid } from "nanoid";
import type { Breakpoint } from "@webstudio-is/sdk";
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
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@webstudio-is/design-system";
import { MinusIcon, PlusIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import { $breakpoints } from "~/shared/sync/data-stores";
import { groupBreakpoints, isBaseBreakpoint } from "~/shared/breakpoints";
import { serverSyncStore } from "~/shared/sync/sync-stores";
import { ConditionInput } from "./condition-input";
import { CssValueInput } from "~/builder/features/style-panel/shared/css-value-input";
import { useLocalValue } from "~/builder/features/settings-panel/shared";
import { buildBreakpointFromEditorState } from "./breakpoint-editor-utils";

type BreakpointEditorItemProps = {
  breakpoint: Breakpoint;
  autoFocus?: boolean;
  onChangeComplete: (breakpoint: Breakpoint) => void;
  onDelete: (breakpoint: Breakpoint) => void;
};

const BreakpointEditorItem = ({
  breakpoint,
  autoFocus,
  onChangeComplete,
  onDelete,
}: BreakpointEditorItemProps) => {
  const [type, setType] = useState<"minWidth" | "maxWidth">(
    breakpoint.maxWidth !== undefined ? "maxWidth" : "minWidth"
  );

  const initialValue = useMemo(
    () => ({
      label: breakpoint.label,
      condition: breakpoint.condition ?? "",
      width: breakpoint.minWidth ?? breakpoint.maxWidth ?? 0,
    }),
    [
      breakpoint.label,
      breakpoint.condition,
      breakpoint.minWidth,
      breakpoint.maxWidth,
    ]
  );

  const localValue = useLocalValue(
    initialValue,
    (value) => {
      const newBreakpoint = buildBreakpointFromEditorState(
        breakpoint.id,
        value.label,
        value.condition,
        type,
        value.width,
        breakpoint
      );

      if (newBreakpoint !== undefined) {
        onChangeComplete(newBreakpoint);
      }
    },
    { autoSave: true }
  );

  const hasCondition = localValue.value.condition.trim() !== "";

  return (
    <Flex gap="2">
      <Flex direction="column" gap="1">
        <InputField
          type="text"
          value={localValue.value.label}
          onChange={(event) =>
            localValue.set({ ...localValue.value, label: event.target.value })
          }
          onBlur={localValue.save}
          placeholder="Breakpoint name"
          minLength={1}
          required
          autoFocus={autoFocus}
        />
        <Flex gap="2" css={{ width: theme.spacing[26] }}>
          <Select
            css={{ width: theme.spacing[28] }}
            options={["maxWidth", "minWidth"]}
            getLabel={(option) =>
              option === "maxWidth" ? "Max Width" : "Min Width"
            }
            value={type}
            onChange={(value) => {
              setType(value as "minWidth" | "maxWidth");
              localValue.save();
            }}
            disabled={hasCondition}
          />
          <Box css={{ flexShrink: 1 }}>
            <CssValueInput
              styleSource="local"
              property="width"
              value={{
                type: "unit",
                value: localValue.value.width,
                unit: "px",
              }}
              intermediateValue={undefined}
              disabled={hasCondition}
              getOptions={() => []}
              onChange={(value) => {
                if (value?.type === "unit") {
                  localValue.set({
                    ...localValue.value,
                    width: Math.max(0, value.value),
                  });
                } else if (value?.type === "intermediate") {
                  const parsed = parseFloat(value.value);
                  if (!isNaN(parsed)) {
                    localValue.set({
                      ...localValue.value,
                      width: Math.max(0, parsed),
                    });
                  }
                }
              }}
              onChangeComplete={(event) => {
                if (event.value.type === "unit") {
                  localValue.set({
                    ...localValue.value,
                    width: Math.max(0, event.value.value),
                  });
                  localValue.save();
                }
              }}
              onHighlight={() => {}}
              onAbort={() => {
                localValue.set({
                  ...localValue.value,
                  width: breakpoint.minWidth ?? breakpoint.maxWidth ?? 0,
                });
              }}
              onReset={() => {
                localValue.set({ ...localValue.value, width: 0 });
                localValue.save();
              }}
            />
          </Box>
        </Flex>
        <ConditionInput
          value={localValue.value.condition}
          onChange={(value) => {
            localValue.set({ ...localValue.value, condition: value });
          }}
          onBlur={localValue.save}
        />
      </Flex>
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
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const BreakpointsEditor = ({
  onDelete,
  children,
  open,
  onOpenChange,
}: BreakpointsEditorProps) => {
  const breakpoints = useStore($breakpoints);
  const [addedBreakpoints, setAddedBreakpoints] = useState<Breakpoint[]>([]);

  // Use current breakpoints from store, not stale cached version
  const grouped = groupBreakpoints(Array.from(breakpoints.values()));
  const currentBreakpointsFlat = [...grouped.widthBased, ...grouped.custom];

  const allBreakpoints = [
    ...addedBreakpoints,
    ...currentBreakpointsFlat.filter(
      (breakpoint) =>
        addedBreakpoints.find((added) => added.id === breakpoint.id) ===
        undefined
    ),
  ].filter(
    (breakpoint) =>
      breakpoint.condition !== undefined ||
      isBaseBreakpoint(breakpoint) === false
  );

  const handleChangeComplete = (breakpoint: Breakpoint) => {
    serverSyncStore.createTransaction([$breakpoints], (breakpoints) => {
      breakpoints.set(breakpoint.id, breakpoint);
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen === false) {
      setAddedBreakpoints([]);
    }
    onOpenChange?.(newOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent>
        <Flex direction="column">
          <PanelTitle
            css={{ paddingInline: theme.panel.paddingInline }}
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
          <Fragment>
            {allBreakpoints.map((breakpoint, index, all) => {
              return (
                <Fragment key={breakpoint.id}>
                  <Box css={{ p: theme.panel.padding }}>
                    <BreakpointEditorItem
                      breakpoint={breakpoint}
                      onChangeComplete={handleChangeComplete}
                      onDelete={onDelete}
                      autoFocus={index === 0}
                    />
                  </Box>
                  {index < all.length - 1 && <PopoverSeparator />}
                </Fragment>
              );
            })}
          </Fragment>
          {allBreakpoints.length === 0 && (
            <Text css={{ margin: theme.spacing[10] }}>
              No breakpoints found
            </Text>
          )}
        </Flex>
      </PopoverContent>
    </Popover>
  );
};
