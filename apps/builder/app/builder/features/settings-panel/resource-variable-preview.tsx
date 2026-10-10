import { useEffect, useMemo, useState } from "react";
import { useStore } from "@nanostores/react";
import { javascript } from "@codemirror/lang-javascript";
import { Button, Flex, Grid } from "@webstudio-is/design-system";
import { resourceRequest, type ResourceRequest } from "@webstudio-is/sdk";
import { isAssetsResourceRequest } from "@webstudio-is/sdk/runtime";
import { formatValue } from "~/builder/shared/expression-editor";
import { EditorContent, foldGutterExtension } from "~/shared/code-editor-base";
import {
  $previewFormExchanges,
  $resourcePreviewExchanges,
  getLatestPreviewExchange,
} from "~/shared/preview-form-inspection";
import { $resources } from "~/shared/sync/data-stores";
import {
  $pendingResourceKeys,
  $resourceDiagnosticsCache,
  $resourceDiagnosticsErrorCache,
  $resourcePerformanceCache,
  $resourcesCache,
  computeResourceRequest,
  getResourceKey,
  loadResourceDiagnostics,
} from "~/shared/resources";
import type { AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import type { ResourcePerformance } from "~/shared/resource-diagnostics";
import { useResourceScope } from "./resource-scope";
import {
  clearSettledDiagnosticsKey,
  RequestInspector,
} from "./request-inspector";
import {
  getRequestErrorDiagnostics,
  RequestErrorDiagnostics,
} from "./request-error-diagnostics";
import { ResourceDiagnosticsView } from "./resource-diagnostics-view";
import type { VariablePreviewProps } from "./variable-types";

export const ResourceVariablePreview = ({
  variable,
  variableType,
  variableValue,
  showSavedResourceRequest,
  isComputingRequest,
  onLoadData,
  onLoadEmailRequest,
  emailRequestPreview,
  queryActive,
  queryPending,
  queryContainerRef,
}: VariablePreviewProps) => {
  const [pendingDiagnosticsKey, setPendingDiagnosticsKey] = useState<string>();
  const isResource =
    variableType === "resource" ||
    variableType === "graphql-resource" ||
    variableType === "sitemap-resource" ||
    variableType === "current-date-resource" ||
    variableType === "assets-resource";
  const pendingResourceKeys = useStore($pendingResourceKeys);
  const resources = useStore($resources);
  const lastExchanges = useStore($previewFormExchanges);
  const resourceExchanges = useStore($resourcePreviewExchanges);
  const inspection =
    variable?.type === "resource"
      ? lastExchanges.get(variable.resourceId)
      : undefined;
  const formExchange = inspection?.attempts.at(-1);
  const resourcesCache = useStore($resourcesCache);
  const resourceDiagnosticsCache = useStore($resourceDiagnosticsCache);
  const resourceDiagnosticsErrorCache = useStore(
    $resourceDiagnosticsErrorCache
  );
  const resourcePerformanceCache = useStore($resourcePerformanceCache);
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
    if (
      variableType === "email-resource" ||
      variable?.type !== "resource" ||
      !showSavedResourceRequest
    ) {
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
    variableType,
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
  let resourceDiagnostics: AssetQueryPreviewDiagnostics | undefined;
  let resourcePerformance: ResourcePerformance | undefined;
  let resourceDiagnosticsError: unknown;
  let computedResourceKey: string | undefined;
  if (computedResourceRequest) {
    const resourceKey = getResourceKey(computedResourceRequest);
    computedResourceKey = resourceKey;
    computedValue = resourcesCache.get(resourceKey);
    resourceDiagnostics = resourceDiagnosticsCache.get(resourceKey);
    resourceDiagnosticsError = resourceDiagnosticsErrorCache.get(resourceKey);
    resourcePerformance = resourcePerformanceCache.get(resourceKey);
  }
  const latestExchange = getLatestPreviewExchange({
    formInspection: inspection,
    resourceInspection:
      computedResourceKey === undefined
        ? undefined
        : resourceExchanges.get(computedResourceKey),
  });
  const latestExchangeIsFormSubmission = latestExchange === formExchange;
  if (latestExchange) {
    computedValue = {
      resourceId: latestExchange.resourceId,
      resourceName: latestExchange.resourceName,
      ...latestExchange.response,
      ok: latestExchange.outcome?.ok ?? latestExchange.response.status < 400,
      attempts: latestExchangeIsFormSubmission
        ? inspection?.attempts.map(
            ({ resourceId, resourceName, response, outcome }, index) => ({
              attempt: index + 1,
              resourceId,
              resourceName,
              ...response,
              ...(outcome === undefined ? {} : { outcome }),
            })
          )
        : undefined,
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
      disabled={previewPending}
      onClick={
        variableType === "email-resource" ? onLoadEmailRequest : onLoadData
      }
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
      {isResource && !computedValue && (
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
    variableType === "resource" ||
    variableType === "graphql-resource" ||
    variableType === "email-resource" ||
    latestExchange !== undefined;
  const alwaysShowRequestTab =
    variableType === "resource" ||
    variableType === "graphql-resource" ||
    variableType === "email-resource";
  if (isResource === false && !inspectSubmission) {
    return previewContent;
  }
  const requestErrorDiagnostics = getRequestErrorDiagnostics(
    latestExchange
      ? latestExchange.outcome
        ? { ...latestExchange.outcome, data: latestExchange.outcome.body }
        : { ...latestExchange.response, data: latestExchange.response.body }
      : computedValue
  );
  const diagnosticsRequestError = getRequestErrorDiagnostics(
    resourceDiagnosticsError
  );
  const preview =
    requestErrorDiagnostics === undefined ? (
      previewContent
    ) : (
      <RequestErrorDiagnostics value={requestErrorDiagnostics} />
    );
  const requestSnapshot = latestExchange
    ? latestExchangeIsFormSubmission && inspection?.attempts.length
      ? inspection.attempts.map(
          ({ resourceId, resourceName, request, kind }, index) => ({
            attempt: index + 1,
            resourceId,
            resourceName,
            kind,
            ...request,
          })
        )
      : {
          resourceId: latestExchange.resourceId,
          resourceName: latestExchange.resourceName,
          ...latestExchange.request,
        }
    : emailRequestPreview;
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
      previewPending={
        variableType === "email-resource" ? false : previewPending
      }
      requestPending={previewPending}
      onDiagnosticsOpen={
        computedResourceRequest !== undefined &&
        isAssetsResourceRequest(computedResourceRequest) &&
        resourceDiagnostics?.artifacts === undefined
          ? () => {
              const diagnosticsKey = getResourceKey(computedResourceRequest);
              setPendingDiagnosticsKey(diagnosticsKey);
              void loadResourceDiagnostics(computedResourceRequest).finally(
                () =>
                  setPendingDiagnosticsKey((pendingKey) =>
                    clearSettledDiagnosticsKey(pendingKey, diagnosticsKey)
                  )
              );
            }
          : undefined
      }
      diagnosticsPending={
        computedResourceKey !== undefined &&
        pendingDiagnosticsKey === computedResourceKey
      }
      diagnostics={
        <ResourceDiagnosticsView
          requestError={requestErrorDiagnostics}
          diagnosticsRequestError={diagnosticsRequestError}
          diagnostics={resourceDiagnostics}
          performance={resourcePerformance}
        />
      }
    />
  );
};
