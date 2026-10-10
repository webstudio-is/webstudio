import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useStore } from "@nanostores/react";
import { javascript } from "@codemirror/lang-javascript";
import { Button, Flex, Grid } from "@webstudio-is/design-system";
import {
  resourceRequest,
  type DataSource,
  type ResourceRequest,
} from "@webstudio-is/sdk";
import { formatValue } from "~/builder/shared/expression-editor";
import { EditorContent, foldGutterExtension } from "~/shared/code-editor-base";
import {
  $resourcePreviewExchanges,
  type PreviewResourceExchange,
} from "~/shared/preview-resource-inspection";
import { $resources } from "~/shared/sync/data-stores";
import {
  $pendingResourceKeys,
  $resourcesCache,
  computeResourceRequest,
  getResourceKey,
} from "~/shared/resources";
import { useResourceScope } from "../../resource-scope";
import { RequestInspector } from "../../request-inspector";
import {
  getRequestErrorDiagnostics,
  RequestErrorDiagnostics,
  type RequestErrorDiagnosticsValue,
} from "../../request-error-diagnostics";
import { ResourceDiagnosticsView } from "./resource-diagnostics-view";

export type ResourcePreviewProps = {
  resolveInspection?: (resourceInspection?: {
    exchange: PreviewResourceExchange;
    revision: number;
  }) => {
    exchange?: PreviewResourceExchange;
    responseAttempts?: unknown[];
    requestAttempts?: unknown[];
  };
  variable?: DataSource;
  variableValue: unknown;
  showEmptyLoadButton?: boolean;
  inspectSubmission?: boolean;
  alwaysShowRequestTab?: boolean;
  showSavedResourceRequest?: boolean;
  isComputingRequest?: boolean;
  onLoadData?: () => void;
  queryActive?: boolean;
  queryPending?: boolean;
  queryContainerRef?: (element: HTMLDivElement | null) => void;
  requestSnapshot?: unknown;
  suppressPreviewPending?: boolean;
  diagnostics?: (
    request: ResourceRequest | undefined,
    requestError: RequestErrorDiagnosticsValue | undefined
  ) => ReactNode;
  onDiagnosticsOpen?: (request: ResourceRequest) => void;
  diagnosticsPending?: (request: ResourceRequest | undefined) => boolean;
};

export const ResourceVariablePreview = ({
  variable,
  variableValue,
  resolveInspection,
  showEmptyLoadButton = false,
  inspectSubmission: inspectSubmissionByDefault = false,
  alwaysShowRequestTab = false,
  showSavedResourceRequest = false,
  isComputingRequest = false,
  onLoadData,
  queryActive = false,
  queryPending = false,
  queryContainerRef,
  requestSnapshot: customRequestSnapshot,
  suppressPreviewPending,
  diagnostics,
  onDiagnosticsOpen,
  diagnosticsPending,
}: ResourcePreviewProps) => {
  const pendingResourceKeys = useStore($pendingResourceKeys);
  const resources = useStore($resources);
  const resourceExchanges = useStore($resourcePreviewExchanges);
  const resourcesCache = useStore($resourcesCache);
  const resourceScope = useResourceScope({ variable });
  const [resolvedResourceRequest, setResolvedResourceRequest] = useState<
    ResourceRequest | undefined
  >(() => resourceRequest.safeParse(variableValue).data);
  useEffect(() => {
    const parsedResourceRequest = resourceRequest.safeParse(variableValue).data;
    if (parsedResourceRequest !== undefined) {
      setResolvedResourceRequest(parsedResourceRequest);
      return;
    }
    if (variable?.type !== "resource" || !showSavedResourceRequest) {
      setResolvedResourceRequest(undefined);
      return;
    }
    const resource = resources.get(variable.resourceId);
    if (resource === undefined) {
      setResolvedResourceRequest(undefined);
      return;
    }
    let active = true;
    setResolvedResourceRequest(undefined);
    void computeResourceRequest(resource, resourceScope.variableValues)
      .then((request) => {
        if (active) {
          setResolvedResourceRequest(request);
        }
      })
      .catch(() => {
        if (active) {
          setResolvedResourceRequest(undefined);
        }
      });
    return () => {
      active = false;
    };
  }, [
    resources,
    resourceScope.variableValues,
    variable,
    variableValue,
    showSavedResourceRequest,
  ]);
  const parsedResourceRequest = resourceRequest.safeParse(variableValue).data;
  const computedResourceRequest =
    parsedResourceRequest ??
    (variable?.type === "resource" && showSavedResourceRequest
      ? resolvedResourceRequest
      : undefined);
  const previewPending =
    isComputingRequest ||
    (computedResourceRequest !== undefined &&
      pendingResourceKeys.has(getResourceKey(computedResourceRequest)));
  let computedValue: unknown;
  let computedResourceKey: string | undefined;
  if (computedResourceRequest) {
    const resourceKey = getResourceKey(computedResourceRequest);
    computedResourceKey = resourceKey;
    computedValue = resourcesCache.get(resourceKey);
  }
  const resourceInspection =
    computedResourceKey === undefined
      ? undefined
      : resourceExchanges.get(computedResourceKey);
  const resolvedInspection = resolveInspection?.(resourceInspection);
  const latestExchange =
    resolvedInspection?.exchange ?? resourceInspection?.exchange;
  if (latestExchange) {
    computedValue = {
      resourceId: latestExchange.resourceId,
      resourceName: latestExchange.resourceName,
      ...latestExchange.response,
      ok: latestExchange.outcome?.ok ?? latestExchange.response.status < 400,
      attempts: resolvedInspection?.responseAttempts,
    };
  }
  const extensions = useMemo(() => [javascript({}), foldGutterExtension], []);
  const editorProps = {
    readOnly: true,
    chromeless: true,
    extensions,
    // compute value as json lazily only when dialog is open
    // by spliting into separate component which is invoked
    // only when dialog content is rendered
    value: formatValue(computedValue),
    onChange: () => {},
    onChangeComplete: () => {},
  };
  const loadDataButton = (
    <Button
      type="button"
      disabled={previewPending || onLoadData === undefined}
      onClick={onLoadData}
    >
      {previewPending ? "Loading..." : "Load data"}
    </Button>
  );
  const previewContent = (
    <Grid
      align="stretch"
      css={{
        height: "100%",
        overflow: "hidden",
        boxSizing: "content-box",
        position: "relative",
        gridTemplateRows: "minmax(0, 1fr)",
      }}
    >
      <EditorContent {...editorProps} />
      {showEmptyLoadButton && !computedValue && (
        <Flex
          justify="center"
          align="center"
          css={{ position: "absolute", inset: 0 }}
        >
          {loadDataButton}
        </Flex>
      )}
    </Grid>
  );
  const inspectSubmission =
    inspectSubmissionByDefault || latestExchange !== undefined;
  if (!showEmptyLoadButton && !inspectSubmission) {
    return previewContent;
  }
  const requestErrorDiagnostics = getRequestErrorDiagnostics(
    latestExchange
      ? latestExchange.outcome
        ? { ...latestExchange.outcome, data: latestExchange.outcome.body }
        : { ...latestExchange.response, data: latestExchange.response.body }
      : computedValue
  );
  const preview =
    requestErrorDiagnostics === undefined ? (
      previewContent
    ) : (
      <RequestErrorDiagnostics value={requestErrorDiagnostics} />
    );
  const requestSnapshot = latestExchange
    ? resolvedInspection?.requestAttempts ?? {
        resourceId: latestExchange.resourceId,
        resourceName: latestExchange.resourceName,
        ...latestExchange.request,
      }
    : customRequestSnapshot;
  return (
    <RequestInspector
      previewLabel={inspectSubmission ? "Response" : "Preview"}
      request={
        alwaysShowRequestTab || requestSnapshot !== undefined ? (
          requestSnapshot !== undefined ? (
            <EditorContent
              {...editorProps}
              value={formatValue(requestSnapshot)}
            />
          ) : (
            <Flex align="center" justify="center" css={{ height: "100%" }}>
              {loadDataButton}
            </Flex>
          )
        ) : undefined
      }
      queryContainerRef={queryActive ? queryContainerRef : undefined}
      preview={inspectSubmission ? previewContent : preview}
      queryPending={queryPending}
      previewPending={suppressPreviewPending ? false : previewPending}
      requestPending={previewPending}
      onDiagnosticsOpen={
        computedResourceRequest === undefined || onDiagnosticsOpen === undefined
          ? undefined
          : () => onDiagnosticsOpen(computedResourceRequest)
      }
      diagnosticsPending={diagnosticsPending?.(computedResourceRequest)}
      diagnostics={
        diagnostics?.(computedResourceRequest, requestErrorDiagnostics) ?? (
          <ResourceDiagnosticsView requestError={requestErrorDiagnostics} />
        )
      }
    />
  );
};
