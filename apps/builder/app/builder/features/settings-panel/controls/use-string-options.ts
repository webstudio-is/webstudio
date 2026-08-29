import { humanizeAttribute, type ControlProps } from "../shared";
import { useBindableControl } from "./use-bindable-control";

export const useStringOptions = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
  allowEmptyValue = false,
}: Omit<ControlProps<"radio" | "inline-radio" | "select">, "instanceId"> & {
  allowEmptyValue?: boolean;
}) => {
  const value = computedValue === undefined ? undefined : String(computedValue);
  const options =
    value === undefined ||
    (allowEmptyValue && value.length === 0) ||
    meta.options.includes(value)
      ? meta.options
      : [value, ...meta.options];
  const label = humanizeAttribute(meta.label || propName);
  const binding = useBindableControl({
    boundExpression: prop?.type === "expression" ? prop : undefined,
    fallbackExpression: JSON.stringify(computedValue),
  });

  return {
    value,
    options,
    overwritable: binding.bindingState.overwritable,
    binding: {
      ...binding,
      value,
      validate: (value: unknown) => {
        if (
          value !== undefined &&
          meta.options.includes(String(value)) === false
        ) {
          const formatter = new Intl.ListFormat(undefined, {
            type: "disjunction",
          });
          return `${label} expects one of ${formatter.format(meta.options)}`;
        }
      },
      onChangeValue: (value: string | undefined) =>
        onChange({ type: "string", value: value ?? "" }),
      onChangeExpression: (value: string) =>
        onChange({ type: "expression", value }),
      onRemove: (value: unknown) =>
        onChange({ type: "string", value: String(value) }),
    },
  };
};
