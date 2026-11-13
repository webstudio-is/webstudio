import { forwardRef, useImperativeHandle } from "react";
import { useStore } from "@nanostores/react";
import { type DataSource } from "@webstudio-is/sdk";
import {
  sitemapResourceUrl,
  currentDateResourceUrl,
} from "@webstudio-is/sdk/runtime";
import { createResourceFieldsFromFormData } from "@webstudio-is/project-build/runtime";
import { $selectedInstance } from "~/shared/nano-states";
import { $resources } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import type { PanelApi } from "./shared/variable-panel-api";
import { FormResourcePreview } from "./form-resource-preview";
import { VariableEditorLayout } from "./dialog/layout";
import { useResourcePreviewController } from "./shared/use-resource-preview-controller";
import type { VariableEditorProps } from "./shared/editor-types";

export const SystemResourceForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
    resourceType: "sitemap-resource" | "current-date-resource";
  }
>(({ variable, resourceType }, ref) => {
  const resources = useStore($resources);
  const resource =
    variable?.type === "resource"
      ? resources.get(variable.resourceId)
      : undefined;
  const localResourceUrl =
    resourceType === "sitemap-resource"
      ? sitemapResourceUrl
      : currentDateResourceUrl;
  useImperativeHandle(ref, () => ({
    save: (formData) => {
      const scopeInstanceId =
        variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
      if (scopeInstanceId === undefined) {
        return;
      }
      const resourceFields = createResourceFieldsFromFormData({
        control: "system",
        formData,
      });
      return executeRuntimeMutation({
        id: "resources.upsert",
        input: {
          resourceId: resource?.id,
          resource: resourceFields,
          dataSourceId: variable?.id,
          scopeInstanceId,
          dataSourceName: resourceFields.name,
        },
      })?.result;
    },
  }));
  return (
    <>
      <input type="hidden" name="method" value="get" />
      <input
        type="hidden"
        name="url"
        value={JSON.stringify(localResourceUrl)}
      />
    </>
  );
});
SystemResourceForm.displayName = "SystemResourceForm";

export const SystemResourceEditor = forwardRef<
  PanelApi | undefined,
  VariableEditorProps
>((props, ref) => {
  const resourceType = props.variableType;
  const preview = useResourcePreviewController({
    variable: props.variable,
    formRef: props.formRef,
  });
  if (
    resourceType !== "sitemap-resource" &&
    resourceType !== "current-date-resource"
  ) {
    return null;
  }
  return (
    <VariableEditorLayout
      {...props}
      titleActions={props.titleActions({
        onRefresh: () => void preview.reload(),
        refreshStatus: preview.pending ? "refreshing" : "idle",
      })}
      fields={
        <SystemResourceForm
          ref={ref}
          resourceType={resourceType}
          variable={props.variable}
        />
      }
      preview={
        <FormResourcePreview
          variable={props.variable}
          showEmptyLoadButton
          variableValue={preview.request}
          showSavedResourceRequest={preview.showSavedRequest}
          isComputingRequest={preview.pending}
          onLoadData={preview.reload}
        />
      }
    />
  );
});
