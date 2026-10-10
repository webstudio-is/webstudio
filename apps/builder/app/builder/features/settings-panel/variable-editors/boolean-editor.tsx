import { VariableEditorLayout } from "./dialog/layout";
import type { VariableEditorProps } from "./shared/editor-types";

import { Row } from "../shared";
import { ValuePreviewFrame } from "./shared/variable-value-preview";
import { forwardRef, useId } from "react";
import { Flex, Label, Switch, theme } from "@webstudio-is/design-system";
import type { DataSource } from "@webstudio-is/sdk";
import { useValuePanelRef } from "./shared/variable-value-save";
import type { PanelApi } from "./shared/variable-panel-api";

export const prepareBooleanValue = (previous: unknown) =>
  typeof previous === "boolean" ? previous : false;

export const BooleanForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
    value: unknown;
    onChange: (value: unknown) => void;
  }
>(({ variable, value: unknownValue, onChange }, ref) => {
  const value = typeof unknownValue === "boolean" ? unknownValue : false;
  useValuePanelRef({ ref, variable, type: "boolean" });
  const valueId = useId();
  return (
    <>
      <Flex direction="column" css={{ gap: theme.spacing[3] }}>
        <Label htmlFor={valueId}>Value</Label>
        <Switch
          name="value"
          value="on"
          id={valueId}
          checked={value}
          onCheckedChange={onChange}
        />
      </Flex>
    </>
  );
});
BooleanForm.displayName = "BooleanForm";

export const BooleanEditor = forwardRef<
  PanelApi | undefined,
  VariableEditorProps
>((props, ref) => {
  return (
    <VariableEditorLayout
      {...props}
      titleActions={props.titleActions()}
      fields={
        <Row>
          <BooleanForm
            ref={ref}
            variable={props.variable}
            value={props.value}
            onChange={props.onValueChange}
          />
        </Row>
      }
      preview={<ValuePreviewFrame value={props.value} />}
    />
  );
});
