import { VariableEditorLayout } from "./dialog/layout";
import type { VariableEditorProps } from "./shared/editor-types";
import { z } from "zod";
import { forwardRef, useImperativeHandle } from "react";
import { computed } from "nanostores";
import { useStore } from "@nanostores/react";
import type { DataSource } from "@webstudio-is/sdk";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import {
  $selectedInstanceKeyWithRoot,
  $selectedInstanceSelector,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import {
  $livePreviewBrowserInfo,
  $livePreviewFormValues,
} from "~/shared/preview-form-values";
import { resolveFormParameterPreview } from "../form-context-preview";
import { useResourceScope } from "../resource-scope";
import { ValuePreviewFrame } from "./shared/variable-value-preview";
import type { PanelApi } from "./shared/variable-panel-api";

export const ParameterForm = forwardRef<
  undefined | PanelApi,
  { variable?: DataSource }
>(({ variable }, ref) => {
  useImperativeHandle(ref, () => ({
    save: (formData) => {
      // only existing parameter variables can be renamed
      if (variable?.scopeInstanceId === undefined) {
        return;
      }
      const scopeInstanceId = variable.scopeInstanceId;
      const name = z.string().parse(formData.get("name"));
      executeRuntimeMutation({
        id: "variables.update",
        input: {
          dataSourceId: variable.id,
          values: { scopeInstanceId, name },
        },
      });
    },
  }));
  return <></>;
});
ParameterForm.displayName = "ParameterForm";

const $instanceVariableValues = computed(
  [$selectedInstanceKeyWithRoot, $variableValuesByInstanceSelector],
  (instanceKey, variableValuesByInstanceSelector) =>
    variableValuesByInstanceSelector.get(instanceKey ?? "") ??
    new Map<string, unknown>()
);

export const ParameterVariablePreview = ({
  variable,
}: {
  variable?: DataSource;
}) => {
  const variableValues = useStore($instanceVariableValues);
  const instances = useStore($instances);
  const liveFormValues = useStore($livePreviewFormValues);
  const liveBrowserInfo = useStore($livePreviewBrowserInfo);
  const selectedInstanceSelector = useStore($selectedInstanceSelector);
  const resourceScope = useResourceScope({ variable });
  let value =
    variable === undefined
      ? undefined
      : (resourceScope.variableValues.get(variable.id) ??
        variableValues.get(variable.id));
  if (variable !== undefined) {
    value =
      resolveFormParameterPreview(variable, {
        instances,
        selector: selectedInstanceSelector,
        liveFormValues,
        liveBrowserInfo,
      })?.value ?? value;
  }
  return <ValuePreviewFrame value={value} />;
};

export const ParameterEditor = forwardRef<
  PanelApi | undefined,
  VariableEditorProps
>((props, ref) => {
  return (
    <VariableEditorLayout
      {...props}
      titleActions={props.titleActions()}
      fields={<ParameterForm ref={ref} variable={props.variable} />}
      preview={<ParameterVariablePreview variable={props.variable} />}
    />
  );
});
