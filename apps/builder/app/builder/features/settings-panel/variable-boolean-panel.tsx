import { forwardRef, useId } from "react";
import { Flex, Label, Switch, theme } from "@webstudio-is/design-system";
import type { DataSource } from "@webstudio-is/sdk";
import { useValuePanelRef } from "./variable-value-save";
import type { PanelApi } from "./variable-panel-api";

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
