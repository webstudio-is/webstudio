import { useId, useMemo } from "react";
import { InputField, Tooltip } from "@webstudio-is/design-system";
import { validatePrimitiveValue } from "@webstudio-is/project-build/runtime";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import {
  type ControlProps,
  ResponsiveLayout,
  humanizeAttribute,
} from "../shared";
import { PropertyLabel } from "../property-label";
import { useBindableControl } from "./use-bindable-control";

const getDateInput = (source: string) => {
  // Let the platform recognize native date and local date-time values. Keep
  // legacy/invalid values editable instead of silently clearing them.
  const input = document.createElement("input");
  for (const type of ["date", "datetime-local"] as const) {
    input.type = type;
    input.value = source;
    if (input.value !== "" || source === "") {
      return { type, value: input.value, utc: false };
    }
  }
  const date = new Date(source);
  if (Number.isNaN(date.getTime()) === false) {
    input.type = "datetime-local";
    input.value = date.toISOString().slice(0, -1);
    if (input.value !== "") {
      return { type: "datetime-local" as const, value: input.value, utc: true };
    }
  }
  return { type: "text" as const, value: source, utc: false };
};

export const DateControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"date">) => {
  const id = useId();
  const source = String(computedValue ?? "");
  const input = useMemo(() => getDateInput(source), [source]);
  const binding = useBindableControl({
    boundExpression: prop?.type === "expression" ? prop : undefined,
    fallbackExpression: JSON.stringify(computedValue),
  });
  const localValue = useDraftValue(input.value, (value) => {
    if (binding.bindingState.overwritable === false) {
      return;
    }
    onChange({
      type: "string",
      value:
        value !== "" && input.utc ? new Date(`${value}Z`).toISOString() : value,
    });
  });
  const label = humanizeAttribute(meta.label || propName);
  return (
    <ResponsiveLayout
      label={
        <PropertyLabel
          name={propName}
          readOnly={binding.bindingState.overwritable === false}
        />
      }
    >
      <BindableExpressionControl
        {...binding}
        value={source}
        validate={(value) => validatePrimitiveValue(value, label)}
        onChangeValue={(value) => onChange({ type: "string", value })}
        onChangeExpression={(value) => onChange({ type: "expression", value })}
        onRemove={(value) => onChange({ type: "string", value: String(value) })}
        renderControl={({ readOnly }) => (
          <Tooltip
            content={
              binding.fieldError ??
              (input.utc
                ? "Date and time in UTC. Display formatting and time zone are configured separately."
                : "")
            }
            open={
              binding.fieldError === undefined && input.utc === false
                ? false
                : undefined
            }
          >
            <InputField
              id={id}
              aria-label={input.utc ? `${label} (UTC)` : label}
              type={input.type}
              step="any"
              value={localValue.value}
              disabled={readOnly}
              color={binding.fieldError === undefined ? undefined : "error"}
              aria-invalid={binding.fieldError !== undefined || undefined}
              onChange={(event) => {
                if (event.currentTarget.validity.badInput === false) {
                  localValue.set(event.currentTarget.value);
                }
              }}
              onBlur={localValue.save}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  localValue.save();
                }
              }}
            />
          </Tooltip>
        )}
      />
    </ResponsiveLayout>
  );
};
