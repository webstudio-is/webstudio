import { atom, computed } from "nanostores";
import {
  getResourceDataSourceIds,
  type DataSource,
  type DataSources,
  type Resource,
  type ResourceRequest,
  type Resources,
} from "@webstudio-is/sdk";
import {
  isAssetsResourceRequest,
  resourceLoadConcurrency,
} from "@webstudio-is/sdk/runtime";
import { restResourcesLoader } from "./router-utils";
import {
  computeExpression,
  computeExpressionAsync,
} from "@webstudio-is/project-build/runtime";
import { fetch } from "./fetch.client";
import { getResourceKey } from "./resource-utils";
import { type AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import {
  createResourceDiagnosticsResponseError,
  separateResourceDiagnostics,
  type ResourcePerformance,
} from "./resource-diagnostics";

type InFlightResourceBatch = {
  controller: AbortController;
  versions: Map<string, number>;
};

type InFlightResourceDiagnostics = {
  controller: AbortController;
  promise: Promise<void>;
};

export { getResourceKey };

const queue = new Map<string, ResourceRequest>();
const pending = new Map<string, InFlightResourceBatch>();
const cache = new Map<string, unknown>();
const diagnosticsCache = new Map<string, AssetQueryPreviewDiagnostics>();
const diagnosticsErrorCache = new Map<string, unknown>();
const performanceCache = new Map<string, ResourcePerformance>();
const pendingDiagnostics = new Map<string, InFlightResourceDiagnostics>();
const knownRequests = new Map<string, ResourceRequest>();
const resourceVersions = new Map<string, number>();
const inFlightBatches = new Set<InFlightResourceBatch>();

export const $resourcesCache = atom(cache);
export const $resourceDiagnosticsCache = atom(diagnosticsCache);
export const $resourceDiagnosticsErrorCache = atom(diagnosticsErrorCache);
export const $resourcePerformanceCache = atom(performanceCache);

const updateMetadataCache = () => {
  $resourceDiagnosticsCache.set(new Map(diagnosticsCache));
  $resourceDiagnosticsErrorCache.set(new Map(diagnosticsErrorCache));
  $resourcePerformanceCache.set(new Map(performanceCache));
};

const updateCache = () => {
  $resourcesCache.set(new Map(cache));
  updateMetadataCache();
};

const cacheResourceMetadata = ({
  key,
  request,
  result,
  loaderDurationMs,
}: {
  key: string;
  request: ResourceRequest;
  result: unknown;
  loaderDurationMs: number;
}) => {
  const separated = separateResourceDiagnostics({ request, result });
  performanceCache.set(key, {
    ...separated.performance,
    loaderDurationMs: Math.max(0, loaderDurationMs),
  });
  if (separated.diagnostics === undefined) {
    diagnosticsCache.delete(key);
  } else {
    diagnosticsCache.set(key, separated.diagnostics);
  }
  if (separated.diagnosticsError !== undefined) {
    diagnosticsErrorCache.set(key, separated.diagnosticsError);
  }
  return separated;
};

export const $pendingResourceKeys = atom<ReadonlySet<string>>(new Set());
export const $resourcesState = atom<"pending" | "settled">("pending");

const updatePending = () => {
  $pendingResourceKeys.set(new Set([...queue.keys(), ...pending.keys()]));
  $resourcesState.set(
    queue.size === 0 && pending.size === 0 ? "settled" : "pending"
  );
};

export const $hasPendingResources = computed(
  $pendingResourceKeys,
  (pendingResourceKeys) => pendingResourceKeys.size > 0
);

const getInFlightResourceCount = () => {
  let count = 0;
  for (const batch of inFlightBatches) {
    count += batch.versions.size;
  }
  return count;
};

const loadResources = async (requestFetch: typeof fetch = fetch) => {
  const availableSlots = resourceLoadConcurrency - getInFlightResourceCount();
  if (availableSlots <= 0) {
    return;
  }
  const list = Array.from(queue.values()).slice(0, availableSlots);
  if (list.length === 0) {
    return;
  }
  const dispatched = new Map<string, ResourceRequest>();
  const controller = new AbortController();
  const batch = { controller, versions: new Map<string, number>() };
  for (const resource of list) {
    const key = getResourceKey(resource);
    const version = resourceVersions.get(key) ?? 0;
    queue.delete(key);
    pending.set(key, batch);
    dispatched.set(key, resource);
    batch.versions.set(key, version);
  }
  inFlightBatches.add(batch);
  updatePending();

  try {
    const startedAt = performance.now();
    const response = await requestFetch(restResourcesLoader(), {
      method: "POST",
      body: JSON.stringify(list),
      signal: controller.signal,
    });
    if (response.ok === false) {
      return;
    }
    const results = new Map<string, unknown>(await response.json());
    const loaderDurationMs = performance.now() - startedAt;
    for (const [key, result] of results) {
      const request = dispatched.get(key);
      if (
        request === undefined ||
        pending.get(key) !== batch ||
        knownRequests.has(key) === false ||
        resourceVersions.get(key) !== batch.versions.get(key)
      ) {
        continue;
      }
      const separated = cacheResourceMetadata({
        key,
        request,
        result,
        loaderDurationMs,
      });
      cache.set(key, separated.result);
    }
  } catch {
    if (controller.signal.aborted === false) {
      console.error("Resource batch request failed");
    }
  } finally {
    inFlightBatches.delete(batch);
    for (const key of dispatched.keys()) {
      if (pending.get(key) === batch) {
        pending.delete(key);
      }
    }
    updateCache();
    updatePending();
    // Drain any resources that did not fit in this batch.
    if (controller.signal.aborted === false) {
      startLoading(requestFetch);
    }
  }
};

const startLoading = (requestFetch: typeof fetch = fetch) => {
  if (
    getInFlightResourceCount() >= resourceLoadConcurrency ||
    queue.size === 0
  ) {
    return;
  }
  void loadResources(requestFetch);
};

const abortObsoleteBatches = () => {
  for (const batch of inFlightBatches) {
    const isObsolete = Array.from(batch.versions).every(
      ([key, version]) =>
        knownRequests.has(key) === false ||
        resourceVersions.get(key) !== version
    );
    if (isObsolete) {
      batch.controller.abort();
    }
  }
};

const preloadResource = (resource: ResourceRequest) => {
  const key = getResourceKey(resource);
  knownRequests.set(key, resource);
  if (resourceVersions.has(key) === false) {
    resourceVersions.set(key, 0);
  }
  if (queue.has(key) || pending.has(key) || cache.has(key)) {
    return;
  }
  // deduplicate resources in queue
  queue.set(key, resource);
  updatePending();
};

const invalidateRequestState = (key: string) => {
  diagnosticsCache.delete(key);
  diagnosticsErrorCache.delete(key);
  performanceCache.delete(key);
  pendingDiagnostics.get(key)?.controller.abort();
  pendingDiagnostics.delete(key);
  resourceVersions.set(key, (resourceVersions.get(key) ?? 0) + 1);
};

const queueResources = (resources: readonly ResourceRequest[]) => {
  const currentKeys = new Set(resources.map(getResourceKey));
  let pendingChanged = false;
  let diagnosticsChanged = false;
  for (const key of knownRequests.keys()) {
    if (currentKeys.has(key) === false) {
      knownRequests.delete(key);
      invalidateRequestState(key);
      diagnosticsChanged = true;
      pendingChanged = queue.delete(key) || pendingChanged;
      pendingChanged = pending.delete(key) || pendingChanged;
    }
  }
  abortObsoleteBatches();
  if (diagnosticsChanged) {
    updateMetadataCache();
  }
  if (pendingChanged) {
    updatePending();
  }
  for (const resource of resources) {
    preloadResource(resource);
  }
  // Marks an empty or fully cached request set as settled too.
  updatePending();
};

export const preloadResources = (resources: readonly ResourceRequest[]) => {
  queueResources(resources);
  startLoading();
};

const invalidateAndQueueResource = (resource: ResourceRequest) => {
  const key = getResourceKey(resource);
  // Asset saves refresh collection bindings without unmounting their content.
  // Keep the last result until the replacement arrives, including an empty result.
  if (isAssetsResourceRequest(resource) === false) {
    cache.delete(key);
  }
  invalidateRequestState(key);
  pending.delete(key);
  knownRequests.set(key, resource);
  queue.set(key, resource);
};

const queueInvalidatedResource = (resource: ResourceRequest) => {
  invalidateAndQueueResource(resource);
  abortObsoleteBatches();
  updateCache();
  updatePending();
};

export const invalidateResource = (resource: ResourceRequest) => {
  queueInvalidatedResource(resource);
  startLoading();
};

/**
 * Fetches the diagnostics intentionally omitted from ordinary canvas loads.
 * Called lazily when the Diagnostics tab is opened.
 */
export const loadResourceDiagnostics = (
  resource: ResourceRequest,
  requestFetch: typeof fetch = fetch
) => {
  const key = getResourceKey(resource);
  const existing = pendingDiagnostics.get(key);
  if (existing !== undefined) {
    return existing.promise;
  }
  const version = resourceVersions.get(key) ?? 0;
  const controller = new AbortController();
  const promise = Promise.resolve().then(async () => {
    try {
      if (controller.signal.aborted) {
        return;
      }
      const startedAt = performance.now();
      const response = await requestFetch(
        restResourcesLoader({ diagnostics: true }),
        {
          method: "POST",
          body: JSON.stringify([resource]),
          signal: controller.signal,
        }
      );
      if (response.ok === false) {
        let data: unknown;
        try {
          data = await response.json();
        } catch {
          data = undefined;
        }
        if (
          controller.signal.aborted === false &&
          pendingDiagnostics.get(key)?.controller === controller &&
          (resourceVersions.get(key) ?? 0) === version
        ) {
          diagnosticsErrorCache.set(key, {
            ok: false,
            status: response.status,
            statusText: response.statusText,
            data,
          });
          updateMetadataCache();
        }
        return;
      }
      const result = new Map<string, unknown>(await response.json()).get(key);
      const loaderDurationMs = performance.now() - startedAt;
      if (
        controller.signal.aborted ||
        pendingDiagnostics.get(key)?.controller !== controller ||
        (resourceVersions.get(key) ?? 0) !== version
      ) {
        return;
      }
      const separated = cacheResourceMetadata({
        key,
        request: resource,
        result,
        loaderDurationMs,
      });
      if (result === undefined) {
        diagnosticsErrorCache.set(key, {
          ok: false,
          data: {
            error: {
              message: "Resource diagnostics response is missing",
            },
          },
        });
      } else if (
        typeof result === "object" &&
        result !== null &&
        ((result as { ok?: unknown }).ok === false ||
          (typeof (result as { status?: unknown }).status === "number" &&
            ((result as { status: number }).status ?? 0) >= 400))
      ) {
        diagnosticsErrorCache.set(key, result);
      } else if (separated.diagnosticsError !== undefined) {
        diagnosticsErrorCache.set(key, separated.diagnosticsError);
      } else if (separated.diagnostics === undefined) {
        diagnosticsErrorCache.set(
          key,
          createResourceDiagnosticsResponseError({
            message: "Resource diagnostics response is missing",
            issues: [
              {
                code: "missing_diagnostics",
                path: ["__diagnostics__"],
                message:
                  "The resource response does not contain diagnostics data",
              },
            ],
          })
        );
      } else {
        diagnosticsErrorCache.delete(key);
      }
      updateMetadataCache();
    } catch (error) {
      if (controller.signal.aborted === false) {
        console.error("Resource diagnostics request failed");
        if (
          pendingDiagnostics.get(key)?.controller === controller &&
          (resourceVersions.get(key) ?? 0) === version
        ) {
          diagnosticsErrorCache.set(key, {
            ok: false,
            data: {
              error: {
                message:
                  error instanceof Error
                    ? error.message
                    : "Resource diagnostics request failed",
              },
            },
          });
          updateMetadataCache();
        }
      }
    } finally {
      if (pendingDiagnostics.get(key)?.controller === controller) {
        pendingDiagnostics.delete(key);
      }
    }
  });
  pendingDiagnostics.set(key, { controller, promise });
  return promise;
};

/**
 * Invalidate the assets system resource.
 * Call this when assets are uploaded, deleted, or modified to refresh expressions using assets.
 */
export const invalidateAssets = (requestFetch: typeof fetch = fetch) => {
  for (const request of knownRequests.values()) {
    if (isAssetsResourceRequest(request) === false) {
      continue;
    }
    invalidateAndQueueResource(request);
  }
  abortObsoleteBatches();
  updateCache();
  updatePending();
  startLoading(requestFetch);
};

export const computeResourceRequest = (
  resource: Resource,
  values: Map<DataSource["id"], unknown>
): ResourceRequest => {
  const request: ResourceRequest = {
    name: resource.name,
    method: resource.method,
    url: computeExpression(resource.url, values),
    searchParams: (resource.searchParams ?? []).map(({ name, value }) => ({
      name,
      value: computeExpression(value, values),
    })),
    headers: resource.headers.map(({ name, value }) => ({
      name,
      value: computeExpression(value, values),
    })),
  };
  if (resource.body !== undefined) {
    request.body = computeExpression(resource.body, values);
  }
  return request;
};

export const computeResourceRequestAsync = async (
  resource: Resource,
  values: ReadonlyMap<DataSource["id"], unknown>
): Promise<ResourceRequest> => {
  const [url, searchParams, headers, body] = await Promise.all([
    computeExpressionAsync(resource.url, values),
    Promise.all(
      (resource.searchParams ?? []).map(async ({ name, value }) => ({
        name,
        value: await computeExpressionAsync(value, values),
      }))
    ),
    Promise.all(
      resource.headers.map(async ({ name, value }) => ({
        name,
        value: await computeExpressionAsync(value, values),
      }))
    ),
    resource.body === undefined
      ? undefined
      : computeExpressionAsync(resource.body, values),
  ]);
  const request: ResourceRequest = {
    name: resource.name,
    method: resource.method,
    url,
    searchParams,
    headers,
  };
  if (resource.body !== undefined) {
    request.body = body;
  }
  return request;
};

const getDataSourcesByResourceId = (dataSources: DataSources) => {
  const dataSourcesByResourceId = new Map<Resource["id"], DataSource[]>();
  for (const dataSource of dataSources.values()) {
    if (dataSource.type !== "resource") {
      continue;
    }
    const entries = dataSourcesByResourceId.get(dataSource.resourceId) ?? [];
    entries.push(dataSource);
    dataSourcesByResourceId.set(dataSource.resourceId, entries);
  }
  return dataSourcesByResourceId;
};

const getResourceDependencyIds = ({
  resource,
  dataSources,
}: {
  resource: Resource;
  dataSources: DataSources;
}) => {
  const dependencyIds = new Set<Resource["id"]>();
  for (const dataSourceId of getResourceDataSourceIds(resource)) {
    const dataSource = dataSources.get(dataSourceId);
    if (dataSource?.type === "resource") {
      dependencyIds.add(dataSource.resourceId);
    }
  }
  return dependencyIds;
};

export const computeResourceRequestPlan = ({
  rootResourceIds,
  resources,
  dataSources,
  values,
  resourceCache,
}: {
  rootResourceIds: Iterable<Resource["id"]>;
  resources: Resources;
  dataSources: DataSources;
  values: Map<DataSource["id"], unknown>;
  resourceCache: ReadonlyMap<string, unknown>;
}) => {
  const resolvedValues = new Map(values);
  const documents = new Map<Resource["id"], unknown>();
  const requests = new Map<Resource["id"], ResourceRequest>();
  const state = new Map<Resource["id"], "visiting" | "resolved" | "waiting">();
  const dataSourcesByResourceId = getDataSourcesByResourceId(dataSources);

  const visit = (resourceId: Resource["id"]): boolean => {
    const resourceState = state.get(resourceId);
    if (resourceState === "resolved") {
      return true;
    }
    if (resourceState === "visiting" || resourceState === "waiting") {
      return false;
    }
    const resource = resources.get(resourceId);
    if (resource === undefined) {
      state.set(resourceId, "waiting");
      return false;
    }
    state.set(resourceId, "visiting");
    for (const dependencyId of getResourceDependencyIds({
      resource,
      dataSources,
    })) {
      if (visit(dependencyId) === false) {
        state.set(resourceId, "waiting");
        return false;
      }
    }
    const request = computeResourceRequest(resource, resolvedValues);
    requests.set(resourceId, request);
    const key = getResourceKey(request);
    if (resourceCache.has(key) === false) {
      state.set(resourceId, "waiting");
      return false;
    }
    const document = resourceCache.get(key);
    documents.set(resourceId, document);
    for (const dataSource of dataSourcesByResourceId.get(resourceId) ?? []) {
      resolvedValues.set(dataSource.id, document);
    }
    state.set(resourceId, "resolved");
    return true;
  };

  for (const resourceId of rootResourceIds) {
    visit(resourceId);
  }
  return {
    requests: Array.from(requests.values()),
    documents,
  };
};

export const computeResourceRequestPlanAsync = async ({
  rootResourceIds,
  resources,
  dataSources,
  values,
  resourceCache,
}: {
  rootResourceIds: Iterable<Resource["id"]>;
  resources: Resources;
  dataSources: DataSources;
  values: ReadonlyMap<DataSource["id"], unknown>;
  resourceCache: ReadonlyMap<string, unknown>;
}) => {
  const resolvedValues = new Map(values);
  const documents = new Map<Resource["id"], unknown>();
  const requests = new Map<Resource["id"], ResourceRequest>();
  const pending = new Map<Resource["id"], Promise<boolean>>();
  const dataSourcesByResourceId = getDataSourcesByResourceId(dataSources);

  const visit = (
    resourceId: Resource["id"],
    ancestors: ReadonlySet<Resource["id"]> = new Set()
  ): Promise<boolean> => {
    if (ancestors.has(resourceId)) {
      return Promise.resolve(false);
    }
    const previous = pending.get(resourceId);
    if (previous !== undefined) {
      return previous;
    }
    const nextAncestors = new Set(ancestors).add(resourceId);
    const resolution = Promise.resolve().then(async () => {
      const resource = resources.get(resourceId);
      if (resource === undefined) {
        return false;
      }
      const dependencyIds = getResourceDependencyIds({
        resource,
        dataSources,
      });
      const dependenciesResolved = await Promise.all(
        [...dependencyIds].map((dependencyId) =>
          visit(dependencyId, nextAncestors)
        )
      );
      if (dependenciesResolved.some((resolved) => resolved === false)) {
        return false;
      }
      const request = await computeResourceRequestAsync(
        resource,
        resolvedValues
      );
      requests.set(resourceId, request);
      const key = getResourceKey(request);
      if (resourceCache.has(key) === false) {
        return false;
      }
      const document = resourceCache.get(key);
      documents.set(resourceId, document);
      for (const dataSource of dataSourcesByResourceId.get(resourceId) ?? []) {
        resolvedValues.set(dataSource.id, document);
      }
      return true;
    });
    pending.set(resourceId, resolution);
    return resolution;
  };

  await Promise.all(
    [...new Set(rootResourceIds)].map((resourceId) => visit(resourceId))
  );
  return {
    requests: Array.from(requests.values()),
    documents,
  };
};

const reset = () => {
  for (const batch of inFlightBatches) {
    batch.controller.abort();
  }
  inFlightBatches.clear();
  queue.clear();
  pending.clear();
  cache.clear();
  diagnosticsCache.clear();
  diagnosticsErrorCache.clear();
  performanceCache.clear();
  for (const { controller } of pendingDiagnostics.values()) {
    controller.abort();
  }
  pendingDiagnostics.clear();
  knownRequests.clear();
  resourceVersions.clear();
  updateCache();
  updatePending();
};

const getLoaderState = () => ({
  queueSize: queue.size,
  pendingSize: pending.size,
});

export const __testing__ = {
  getLoaderState,
  loadResources,
  queueInvalidatedResource,
  queueResources,
  reset,
  startLoading,
};
