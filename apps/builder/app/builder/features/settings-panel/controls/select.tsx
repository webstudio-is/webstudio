import { useId } from "react";
import { Select } from "@webstudio-is/design-system";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { type ControlProps, VerticalLayout } from "../shared";
import { PropertyLabel } from "../property-label";
import { useStringOptions } from "./use-string-options";

export const SelectControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"select">) => {
  const id = useId();

  const { options, overwritable, binding } = useStringOptions({
    meta,
    prop,
    propName,
    computedValue,
    onChange,
    allowEmptyValue: true,
  });

  return (
    <VerticalLayout
      label={
        <PropertyLabel name={propName} readOnly={overwritable === false} />
      }
    >
      <BindableExpressionControl
        {...binding}
        showBinding={meta.bindable !== false}
        renderControl={({ value, readOnly, onChangeValue }) => (
          <Select
            fullWidth
            id={id}
            disabled={readOnly}
            value={value}
            options={options}
            onChange={onChangeValue}
          />
        )}
      />
    </VerticalLayout>
  );
};
