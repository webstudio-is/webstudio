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
import { ResourceVariablePreview } from "./shared/resource-variable-preview";
import { VariableEditorBody } from "./shared/editor-body";
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

export const SystemResourceEditor = (props: VariableEditorProps) => {
  const resourceType = props.previewProps.variableType;
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
    <VariableEditorBody
      {...props}
      titleActions={props.titleActions({
        onRefresh: () => void preview.reload(),
        refreshPending: preview.pending,
      })}
      fields={
        <SystemResourceForm
          ref={props.panelRef}
          resourceType={resourceType}
          variable={props.variable}
        />
      }
      preview={
        <ResourceVariablePreview
          {...props.previewProps}
          showEmptyLoadButton
          variableValue={preview.request}
          showSavedResourceRequest={preview.showSavedRequest}
          isComputingRequest={preview.pending}
          onLoadData={preview.reload}
        />
      }
    />
  );
};
