import { forwardRef, useId } from "react";
import { Flex, Label, TextArea, theme } from "@webstudio-is/design-system";
import type { DataSource } from "@webstudio-is/sdk";
import {
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
} from "~/shared/code-editor-base";
import { useValuePanelRef } from "./variable-value-save";
import type { PanelApi } from "./variable-panel-api";

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
