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
import { useValuePanelRef } from "./variable-value-save";
import type { PanelApi } from "./variable-panel-api";
import { ValuePreviewFrame } from "./variable-value-preview";

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
