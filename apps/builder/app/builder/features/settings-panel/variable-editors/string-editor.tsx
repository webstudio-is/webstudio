import { VariableEditorBody } from "./shared/editor-body";
import type { VariableEditorProps } from "./shared/editor-types";
import { Row } from "../shared";
import { ValuePreviewFrame } from "./shared/variable-value-preview";
import { forwardRef, useId } from "react";
import { Flex, Label, TextArea, theme } from "@webstudio-is/design-system";
import type { DataSource } from "@webstudio-is/sdk";
import {
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
} from "~/shared/code-editor-base";
import { useValuePanelRef } from "./shared/variable-value-save";
import type { PanelApi } from "./shared/variable-panel-api";

export const prepareStringValue = (previous: unknown) =>
  typeof previous === "string" ? previous : "";

export const StringForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
    value: unknown;
    onChange: (value: unknown) => void;
  }
>(({ variable, value: unknownValue, onChange }, ref) => {
  const value = typeof unknownValue === "string" ? unknownValue : "";
  useValuePanelRef({ ref, variable, type: "string" });
  const valueId = useId();
  return (
    <Flex direction="column" css={{ gap: theme.spacing[3] }}>
      <Label htmlFor={valueId}>Value</Label>
      <EditorDialogControl>
        <TextArea
          name="value"
          rows={1}
          maxRows={10}
          autoGrow={true}
          id={valueId}
          value={value}
          onChange={onChange}
        />
        <EditorDialog
          title="Variable value"
          content={
            <TextArea
              grow={true}
              id={valueId}
              value={value}
              onChange={onChange}
            />
          }
        >
          <EditorDialogButton />
        </EditorDialog>
      </EditorDialogControl>
    </Flex>
  );
});
StringForm.displayName = "StringForm";

export const StringEditor = (props: VariableEditorProps) => (
  <VariableEditorBody
    {...props}
    titleActions={props.titleActions()}
    fields={
      <Row>
        <StringForm
          ref={props.panelRef}
          variable={props.variable}
          value={props.value}
          onChange={props.onValueChange}
        />
      </Row>
    }
    preview={<ValuePreviewFrame value={props.previewProps.variableValue} />}
  />
);
