import { z } from "zod";
import { useImperativeHandle, type Ref } from "react";
import type { DataSource } from "@webstudio-is/sdk";
import { $selectedInstance } from "~/shared/nano-states";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { createDataVariableValueFromInput } from "@webstudio-is/project-build/runtime";
import type { PanelApi } from "./variable-panel-api";

export type ValueVariableType = "string" | "number" | "boolean" | "json";

const saveVariable = (
  variable: undefined | DataSource,
  type: ValueVariableType,
  formData: FormData
) => {
  // preserve existing instance scope when edit
  const scopeInstanceId =
    variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
  if (scopeInstanceId === undefined) {
    return;
  }
  const name = z.string().parse(formData.get("name"));
  const value = z.string().nullable().parse(formData.get("value"));
  const variableValue = createDataVariableValueFromInput({ type, value });
  if (variable === undefined) {
    executeRuntimeMutation({
      id: "variables.create",
      input: {
        scopeInstanceId,
        name,
        value: variableValue,
      },
    });
  } else {
    executeRuntimeMutation({
      id: "variables.update",
      input: {
        dataSourceId: variable.id,
        values: {
          scopeInstanceId,
          name,
          value: variableValue,
        },
      },
    });
  }
};

export const useValuePanelRef = ({
  ref,
  variable,
  type,
}: {
  ref: Ref<undefined | PanelApi>;
  variable?: DataSource;
  type: ValueVariableType;
}) => {
  useImperativeHandle(ref, () => ({
    save: (formData) => {
      saveVariable(variable, type, formData);
    },
  }));
};
