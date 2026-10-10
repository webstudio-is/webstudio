import { VariableEditorLayout } from "./dialog/layout";
import type { VariableEditorProps } from "./shared/editor-types";
import { FormResourcePreview } from "./form-resource-preview";
import { useResourcePreviewController } from "./shared/use-resource-preview-controller";
import {
  forwardRef,
  lazy,
  Suspense,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import { useStore } from "@nanostores/react";
import { type DataSource, type ResourceRequest } from "@webstudio-is/sdk";
import {
  assetsResourceUrl,
  isAssetsResourceRequest,
} from "@webstudio-is/sdk/runtime";
import { createResourceFieldsFromFormData } from "@webstudio-is/project-build/runtime";
import { $selectedInstance } from "~/shared/nano-states";
import { $resources } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import {
  $resourceDiagnosticsCache,
  $resourceDiagnosticsErrorCache,
  $resourcePerformanceCache,
  getResourceKey,
  invalidateAssets,
  loadResourceDiagnostics,
} from "~/shared/resources";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { useResourceScope } from "../resource-scope";
import { clearSettledDiagnosticsKey } from "../request-inspector";
import { getRequestErrorDiagnostics } from "../request-error-diagnostics";
import { ResourceDiagnosticsView } from "./shared/resource-diagnostics-view";
import { CenteredPanelMessage } from "../shared";
import type { PanelApi } from "./shared/variable-panel-api";

const AssetQueryForm = lazy(() =>
  import("../asset-query-form").then(({ AssetQueryForm }) => ({
    default: AssetQueryForm,
  }))
);

/** The Assets editor and preview exchange one query portal through this hook. */
export const useAssetsQueryBridge = () => {
  const [active, onActiveChange] = useState(false);
  const [pending, onPendingChange] = useState(false);
  const [sourceContainer, setSourceContainer] = useState<HTMLDivElement | null>(
    null
  );
  const containerRef = useCallback(
    (element: HTMLDivElement | null) => setSourceContainer(element),
    []
  );
  return {
    active,
    pending,
    sourceContainer,
    containerRef,
    onActiveChange,
    onPendingChange,
  };
};

export const getReloadableAssetsResourceFormData = (
  form: HTMLFormElement | null
) => {
  const formData = new FormData(form ?? undefined);
  return formData.get("asset-query-valid") === "false" ? undefined : formData;
};

const AssetQueryLoadingFallback = ({
  onPendingChange,
}: {
  onPendingChange?: (pending: boolean) => void;
}) => {
  useEffect(() => {
    onPendingChange?.(true);
    return () => onPendingChange?.(false);
  }, [onPendingChange]);
  return <CenteredPanelMessage>Loading query editor…</CenteredPanelMessage>;
};

export const AssetsResourceForm = forwardRef<
  undefined | PanelApi,
  {
    variable?: DataSource;
    onChange?: () => void;
    querySourceContainer?: Element | null;
    onQueryActiveChange?: (active: boolean) => void;
    onQueryPendingChange?: (pending: boolean) => void;
  }
>(
  (
    {
      variable,
      onChange,
      querySourceContainer,
      onQueryActiveChange,
      onQueryPendingChange,
    },
    ref
  ) => {
    const { scope, aliases } = useResourceScope({ variable });
    const resources = useStore($resources);
    const resource =
      variable?.type === "resource"
        ? resources.get(variable.resourceId)
        : undefined;

    useEffect(() => {
      onQueryActiveChange?.(true);
      return () => {
        onQueryActiveChange?.(false);
        onQueryPendingChange?.(false);
      };
    }, [onQueryActiveChange, onQueryPendingChange]);

    useImperativeHandle(ref, () => ({
      save: (formData) => {
        if (formData.get("asset-query-valid") === "false") {
          return false;
        }
        const scopeInstanceId =
          variable?.scopeInstanceId ?? $selectedInstance.get()?.id;
        if (scopeInstanceId === undefined) {
          return;
        }
        const resourceFields = createResourceFieldsFromFormData({
          control: "system",
          formData,
        });
        const result = executeRuntimeMutation({
          id: "resources.upsert",
          input: {
            resourceId: resource?.id,
            resource: resourceFields,
            dataSourceId: variable?.id,
            scopeInstanceId,
            dataSourceName: resourceFields.name,
          },
        });
        if (result !== undefined) {
          // The initial preview can finish before the updated build reaches the
          // server. Refresh again once merged-database planning sees the save.
          onNextTransactionComplete(invalidateAssets);
        }
        return result?.result;
      },
    }));

    return (
      <>
        <input type="hidden" name="method" value="post" />
        <input
          type="hidden"
          name="url"
          value={JSON.stringify(assetsResourceUrl)}
        />
        <Suspense
          fallback={
            <AssetQueryLoadingFallback onPendingChange={onQueryPendingChange} />
          }
        >
          <AssetQueryForm
            resource={resource}
            scope={scope}
            aliases={aliases}
            sourceContainer={querySourceContainer}
            onPendingChange={onQueryPendingChange}
            onChange={onChange}
          />
        </Suspense>
      </>
    );
  }
);
AssetsResourceForm.displayName = "AssetsResourceForm";

export const AssetsResourceEditor = forwardRef<
  PanelApi | undefined,
  VariableEditorProps
>((props, ref) => {
  const query = useAssetsQueryBridge();
  const preview = useResourcePreviewController({
    variable: props.variable,
    formRef: props.formRef,
    getFormData: getReloadableAssetsResourceFormData,
  });
  const [pendingDiagnosticsKey, setPendingDiagnosticsKey] = useState<string>();
  const diagnosticsCache = useStore($resourceDiagnosticsCache);
  const diagnosticsErrorCache = useStore($resourceDiagnosticsErrorCache);
  const performanceCache = useStore($resourcePerformanceCache);
  const getDiagnosticsKey = (request: ResourceRequest | undefined) =>
    request === undefined ? undefined : getResourceKey(request);

  return (
    <VariableEditorLayout
      {...props}
      titleActions={props.titleActions({
        onRefresh: () => void preview.reload(),
        refreshStatus: preview.pending ? "refreshing" : "idle",
      })}
      fields={
        <AssetsResourceForm
          ref={ref}
          variable={props.variable}
          onChange={preview.onChange}
          querySourceContainer={query.sourceContainer}
          onQueryActiveChange={query.onActiveChange}
          onQueryPendingChange={query.onPendingChange}
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
          queryActive={query.active}
          queryPending={query.pending}
          queryContainerRef={query.containerRef}
          onDiagnosticsOpen={(request) => {
            if (!isAssetsResourceRequest(request)) {
              return;
            }
            const key = getResourceKey(request);
            if (diagnosticsCache.get(key)?.artifacts !== undefined) {
              return;
            }
            setPendingDiagnosticsKey(key);
            void loadResourceDiagnostics(request).finally(() =>
              setPendingDiagnosticsKey((pendingKey) =>
                clearSettledDiagnosticsKey(pendingKey, key)
              )
            );
          }}
          diagnosticsPending={(request) =>
            pendingDiagnosticsKey !== undefined &&
            getDiagnosticsKey(request) === pendingDiagnosticsKey
          }
          diagnostics={(request, requestError) => {
            const key = getDiagnosticsKey(request);
            return (
              <ResourceDiagnosticsView
                requestError={requestError}
                diagnosticsRequestError={getRequestErrorDiagnostics(
                  key === undefined ? undefined : diagnosticsErrorCache.get(key)
                )}
                diagnostics={
                  key === undefined ? undefined : diagnosticsCache.get(key)
                }
                performance={
                  key === undefined ? undefined : performanceCache.get(key)
                }
              />
            );
          }}
        />
      }
    />
  );
});
