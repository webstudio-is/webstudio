import { useId, useState } from "react";
import { useStore } from "@nanostores/react";
import { InputField } from "@webstudio-is/design-system";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  type ControlProps,
  useLocalValue,
  ResponsiveLayout,
  updateExpressionValue,
  $selectedInstanceScope,
  useBindingState,
  humanizeAttribute,
} from "../shared";
import { PropertyLabel } from "../property-label";

export const NumberControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"number">) => {
  const id = useId();

  const [isInvalid, setIsInvalid] = useState(false);
  const number = Number(computedValue);
  const localValue = useLocalValue(
    Number.isNaN(number) ? "" : number,
    (value) => {
      if (typeof value === "number") {
        if (prop?.type === "expression") {
          updateExpressionValue(prop.value, value);
        } else {
          onChange({ type: "number", value });
        }
      }
      if (value === "") {
        setIsInvalid(true);
      }
    }
  );

  const label = humanizeAttribute(meta.label || propName);
  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);
  const { overwritable, variant } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

  return (
    <ResponsiveLayout
      label={
        <PropertyLabel name={propName} readOnly={overwritable === false} />
      }
    >
      <BindingControl>
        <InputField
          id={id}
          disabled={overwritable === false}
          type="number"
          value={localValue.value}
          color={isInvalid ? "error" : undefined}
          onChange={({ target: { valueAsNumber, value } }) => {
            localValue.set(Number.isNaN(valueAsNumber) ? value : valueAsNumber);
            setIsInvalid(false);
          }}
          onBlur={localValue.save}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              localValue.save();
            }
          }}
        />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          validate={(value) => {
            if (value !== undefined && typeof value !== "number") {
              return `${label} expects a number value`;
            }
          }}
          variant={variant}
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) => {
            const number = Number(evaluatedValue);
            onChange({
              type: "number",
              value: Number.isNaN(number) ? 0 : number,
            });
          }}
        />
      </BindingControl>
    </ResponsiveLayout>
  );
};
