import { useStore } from "@nanostores/react";
import { HtmlEditor } from "~/builder/shared/html-editor";
import {
  BindingControl,
  BindingPopover,
} from "~/builder/shared/binding-popover";
import {
  useLocalValue,
  type ControlProps,
  getLabel,
  VerticalLayout,
  Label,
  updateExpressionValue,
  $selectedInstanceScope,
  useBindingState,
} from "../shared";

export const CodeControl = ({
  meta,
  prop,
  propName,
  computedValue,
  deletable,
  onChange,
  onDelete,
}: ControlProps<"code">) => {
  const metaOverride = {
    ...meta,
    control: "text" as const,
  };
  const localValue = useLocalValue(String(computedValue ?? ""), (value) => {
    // sanitize html before saving
    // this is basically what browser does when innerHTML is set
    // but isolated within temporary element
    // so the result is correct markup
    const div = document.createElement("div");
    div.innerHTML = value;
    if (prop?.type === "expression") {
      updateExpressionValue(prop.value, div.innerHTML);
    } else {
      onChange({ type: "string", value: div.innerHTML });
    }
  });
  const label = getLabel(metaOverride, propName);

  const { scope, aliases } = useStore($selectedInstanceScope);
  const expression =
    prop?.type === "expression" ? prop.value : JSON.stringify(computedValue);
  const { overwritable, variant } = useBindingState(
    prop?.type === "expression" ? prop.value : undefined
  );

  return (
    <VerticalLayout
      label={
        <Label
          description={metaOverride.description}
          readOnly={overwritable === false}
        >
          {label}
        </Label>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <BindingControl>
        <HtmlEditor
          readOnly={overwritable === false}
          value={localValue.value}
          onChange={localValue.set}
          onBlur={localValue.save}
        />
        <BindingPopover
          scope={scope}
          aliases={aliases}
          validate={(value) => {
            if (value !== undefined && typeof value !== "string") {
              return `${label} expects a string value`;
            }
          }}
          variant={variant}
          value={expression}
          onChange={(newExpression) =>
            onChange({ type: "expression", value: newExpression })
          }
          onRemove={(evaluatedValue) =>
            onChange({ type: "string", value: String(evaluatedValue) })
          }
        />
      </BindingControl>
    </VerticalLayout>
  );
};
