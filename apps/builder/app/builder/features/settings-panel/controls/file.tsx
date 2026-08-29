import { useId } from "react";
import { Flex, InputField, theme } from "@webstudio-is/design-system";
import { BindableExpressionControl } from "~/builder/shared/bindable-expression";
import { validatePrimitiveValue } from "@webstudio-is/project-build/runtime";
import { useDraftValue } from "~/builder/shared/use-draft-value";
import {
  type ControlProps,
  VerticalLayout,
  humanizeAttribute,
} from "../shared";
import { SelectAsset } from "./select-asset";
import { PropertyLabel } from "../property-label";
import { useBindableControl } from "./use-bindable-control";

const UrlInput = ({
  id,
  readOnly,
  localValue,
}: {
  id: string;
  readOnly: boolean;
  localValue: ReturnType<typeof useDraftValue<undefined | string>>;
}) => (
  <InputField
    id={id}
    disabled={readOnly}
    value={localValue.value ?? ""}
    placeholder="https://www.url.com"
    onChange={(event) => localValue.set(event.target.value)}
    onBlur={localValue.save}
    onKeyDown={(event) => {
      if (event.key === "Enter") {
        localValue.save();
      }
    }}
    css={{ width: "100%" }}
  />
);

export const FileControl = ({
  meta,
  prop,
  propName,
  computedValue,
  onChange,
}: ControlProps<"file">) => {
  const id = useId();
  const binding = useBindableControl({
    boundExpression: prop?.type === "expression" ? prop : undefined,
    fallbackExpression: JSON.stringify(computedValue),
  });

  const localStringValue = useDraftValue(
    // use undefined for asset type to not delete
    // when url is reset by asset selector
    prop?.type === "string" || prop?.type === "expression"
      ? String(computedValue)
      : undefined,
    (value) => {
      if (value === undefined || binding.bindingState.overwritable === false) {
        return;
      }
      onChange({ type: "string", value });
    }
  );

  const label = humanizeAttribute(meta.label || propName);
  return (
    <VerticalLayout label={<PropertyLabel name={propName} />}>
      <Flex css={{ gap: theme.spacing[3] }} direction="column" justify="center">
        <BindableExpressionControl
          {...binding}
          value={localStringValue.value}
          validate={(value) => validatePrimitiveValue(value, label)}
          onChangeValue={(value) =>
            onChange({ type: "string", value: value ?? "" })
          }
          onChangeExpression={(value) =>
            onChange({ type: "expression", value })
          }
          onRemove={(value) =>
            onChange({ type: "string", value: String(value) })
          }
          renderControl={({ readOnly }) => (
            <UrlInput
              id={id}
              readOnly={readOnly}
              localValue={localStringValue}
            />
          )}
        />
        <SelectAsset
          assetId={prop?.type === "asset" ? prop.value : undefined}
          accept={meta.accept}
          onChange={(assetId) => onChange({ type: "asset", value: assetId })}
        />
      </Flex>
    </VerticalLayout>
  );
};
