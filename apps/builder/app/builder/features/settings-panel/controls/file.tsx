import { useStore } from "@nanostores/react";
import { useId, type ReactNode } from "react";
import { Flex, InputField, theme } from "@webstudio-is/design-system";
import { BindingPopover } from "~/builder/shared/binding-popover";
import {
  type ControlProps,
  getLabel,
  VerticalLayout,
  useLocalValue,
  Label,
  updateExpressionValue,
  $selectedInstanceScope,
} from "../shared";
import { SelectAsset } from "./select-asset";

const UrlInput = ({
  id,
  readOnly,
  localValue,
}: {
  id: string;
  readOnly: boolean;
  localValue: ReturnType<typeof useLocalValue<undefined | string>>;
}) => (
  <InputField
    id={id}
    disabled={readOnly}
    value={localValue.value ?? ""}
    placeholder="http://www.url.com"
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

const Row = ({ children }: { children: ReactNode }) => (
  <Flex
    css={{ height: theme.spacing[13], position: "relative" }}
    align="center"
  >
    {children}
  </Flex>
);

export const FileControl = ({
  meta,
  prop,
  propName,
  computedValue,
  readOnly,
  deletable,
  onChange,
  onDelete,
}: ControlProps<"file", "asset" | "string" | "expression">) => {
  const id = useId();

  const localStringValue = useLocalValue(
    // use undefined for asset type to not delete
    // when url is reset by asset selector
    prop?.type === "string" || prop?.type === "expression"
      ? String(computedValue)
      : undefined,
    (value) => {
      if (value === undefined) {
        return;
      } else if (value === "") {
        onDelete();
      } else if (prop?.type === "expression") {
        updateExpressionValue(prop.value, value);
      } else {
        onChange({ type: "string", value });
      }
    }
  );

  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);

  return (
    <VerticalLayout
      label={
        <Label htmlFor={id} description={meta.description}>
          {getLabel(meta, propName)}
        </Label>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <Row>
        <UrlInput id={id} readOnly={readOnly} localValue={localStringValue} />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) =>
            onChange({ type: "string", value: String(evaluatedValue) })
          }
        />
      </Row>
      <Row>
        <SelectAsset
          prop={prop?.type === "asset" ? prop : undefined}
          accept={meta.accept}
          onChange={onChange}
          onDelete={onDelete}
        />
      </Row>
    </VerticalLayout>
  );
};
