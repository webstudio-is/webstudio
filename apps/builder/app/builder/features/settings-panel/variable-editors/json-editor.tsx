import { VariableEditorLayout } from "./dialog/layout";
import type { VariableEditorProps } from "./shared/editor-types";

import { Row } from "../shared";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Flex, Label, theme } from "@webstudio-is/design-system";
import type { DataSource } from "@webstudio-is/sdk";
import { ExpressionEditor } from "~/builder/shared/expression-editor";
import { validateDataVariableJsonValue } from "@webstudio-is/project-build/runtime";
import { useValuePanelRef } from "./shared/variable-value-save";
import type { PanelApi } from "./shared/variable-panel-api";
import { ValuePreviewFrame } from "./shared/variable-value-preview";
import { parseJsonExpression } from "@webstudio-is/expression";

export const prepareJsonValue = (previous: unknown) => previous || "{}";

export const JsonForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
    value: unknown;
    onChange: (value: unknown) => void;
  }
>(({ variable, value: unknownValue, onChange }, ref) => {
  const value = typeof unknownValue === "string" ? unknownValue : "";
  const [valueError, setValueError] = useState("");
  const valueRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    valueRef.current?.setCustomValidity(validateDataVariableJsonValue(value));
    setValueError("");
  }, [value]);
  useValuePanelRef({ ref, variable, type: "json" });
  return (
    <>
      <input
        ref={valueRef}
        style={{ display: "none" }}
        name="value"
        data-color={valueError ? "error" : undefined}
        value={value}
        onChange={() => {}}
        onInvalid={(event) =>
          setValueError(event.currentTarget.validationMessage)
        }
      />
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label>Value</Label>
        <ExpressionEditor
          showLineNumbers
          color={valueError ? "error" : undefined}
          value={value}
          onChange={onChange}
          onChangeComplete={() => valueRef.current?.checkValidity()}
        />
      </Flex>
    </>
  );
});
JsonForm.displayName = "JsonForm";

export const JsonVariablePreview = ({ value }: { value: unknown }) => {
  return <ValuePreviewFrame value={parseJsonExpression(String(value))} />;
};

export const JsonEditor = forwardRef<PanelApi | undefined, VariableEditorProps>(
  (props, ref) => {
    return (
      <VariableEditorLayout
        {...props}
        titleActions={props.titleActions()}
        fields={
          <Row>
            <JsonForm
              ref={ref}
              variable={props.variable}
              value={props.value}
              onChange={props.onValueChange}
            />
          </Row>
        }
        preview={<JsonVariablePreview value={props.value} />}
      />
    );
  }
);
