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
import type { DataSource } from "@webstudio-is/sdk";
import { assetsResourceUrl } from "@webstudio-is/sdk/runtime";
import { createResourceFieldsFromFormData } from "@webstudio-is/project-build/runtime";
import { $selectedInstance } from "~/shared/nano-states";
import { $resources } from "~/shared/sync/data-stores";
import { executeRuntimeMutation } from "~/shared/instance-utils/data";
import { invalidateAssets } from "~/shared/resources";
import { onNextTransactionComplete } from "~/shared/sync/project-queue";
import { useResourceScope } from "./resource-scope";
import { CenteredPanelMessage } from "./shared";
import type { PanelApi } from "./variable-panel-api";

const AssetQueryForm = lazy(() =>
  import("./asset-query-form").then(({ AssetQueryForm }) => ({
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
