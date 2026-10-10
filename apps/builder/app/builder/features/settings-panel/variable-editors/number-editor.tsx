import { VariableEditorLayout } from "./dialog/layout";
import type { VariableEditorProps } from "./shared/editor-types";

import { Row } from "../shared";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import {
  Flex,
  Label,
  InputErrorsTooltip,
  InputField,
  theme,
} from "@webstudio-is/design-system";
import type { DataSource } from "@webstudio-is/sdk";
import { validateDataVariableNumberValue } from "@webstudio-is/project-build/runtime";
import { useValuePanelRef } from "./shared/variable-value-save";
import type { PanelApi } from "./shared/variable-panel-api";
import { ValuePreviewFrame } from "./shared/variable-value-preview";

export const prepareNumberValue = (previous: unknown) =>
  typeof previous === "number" ? previous : "";

export const NumberForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
    value: unknown;
    onChange: (value: unknown) => void;
  }
>(({ variable, value: unknownValue, onChange }, ref) => {
  const value =
    typeof unknownValue === "number" || typeof unknownValue === "string"
      ? unknownValue
      : "";
  const [valueError, setValueError] = useState("");
  const valueRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    valueRef.current?.setCustomValidity(validateDataVariableNumberValue(value));
    setValueError("");
  }, [value]);
  useValuePanelRef({ ref, variable, type: "number" });
  const valueId = useId();
  return (
    <>
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor={valueId}>Value</Label>
        <InputErrorsTooltip errors={valueError ? [valueError] : undefined}>
          <InputField
            inputRef={valueRef}
            name="value"
            id={valueId}
            inputMode="numeric"
            color={valueError ? "error" : undefined}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => valueRef.current?.checkValidity()}
            onInvalid={(event) =>
              setValueError(event.currentTarget.validationMessage)
            }
          />
        </InputErrorsTooltip>
      </Flex>
    </>
  );
});
NumberForm.displayName = "NumberForm";

export const NumberVariablePreview = ({ value }: { value: unknown }) => {
  const parsed = Number(value);
  return <ValuePreviewFrame value={Number.isNaN(parsed) ? value : parsed} />;
};

export const NumberEditor = forwardRef<
  PanelApi | undefined,
  VariableEditorProps
>((props, ref) => {
  return (
    <VariableEditorLayout
      {...props}
      titleActions={props.titleActions()}
      fields={
        <Row>
          <NumberForm
            ref={ref}
            variable={props.variable}
            value={props.value}
            onChange={props.onValueChange}
          />
        </Row>
      }
      preview={<NumberVariablePreview value={props.value} />}
    />
  );
});
