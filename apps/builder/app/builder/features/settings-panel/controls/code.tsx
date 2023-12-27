import { Box, theme } from "@webstudio-is/design-system";
import {
  useLocalValue,
  type ControlProps,
  getLabel,
  VerticalLayout,
  Label,
} from "../shared";
import { VariablesButton } from "../variables";
import { HtmlEditor } from "~/builder/shared/html-editor";

export const CodeControl = ({
  meta,
  prop,
  propName,
  deletable,
  readOnly,
  onChange,
  onDelete,
}: ControlProps<"code", "string">) => {
  const metaOverride = {
    ...meta,
    control: "text" as const,
  };
  const localValue = useLocalValue(prop?.value ?? "", (value) => {
    // sanitize html before saving
    // this is basically what browser does when innerHTML is set
    // but isolated within temporary element
    // so the result is correct markup
    const div = document.createElement("div");
    div.innerHTML = value;
    onChange({ type: "string", value: div.innerHTML });
  });
  const label = getLabel(metaOverride, propName);

  return (
    <VerticalLayout
      label={
        <Box css={{ position: "relative" }}>
          <Label description={metaOverride.description} readOnly={readOnly}>
            {label}
          </Label>
          <VariablesButton
            propId={prop?.id}
            propName={propName}
            propMeta={metaOverride}
          />
        </Box>
      }
      deletable={deletable}
      onDelete={onDelete}
    >
      <Box css={{ py: theme.spacing[2] }}>
        <HtmlEditor
          readOnly={readOnly}
          value={localValue.value}
          onChange={localValue.set}
          onBlur={localValue.save}
        />
      </Box>
    </VerticalLayout>
  );
};
