import { atom, computed } from "nanostores";
import type { DataSource, Resource, ResourceRequest } from "@webstudio-is/sdk";
import { isAssetsResourceRequest } from "@webstudio-is/sdk/runtime";
import { restResourcesLoader } from "./router-utils";
import { computeExpression } from "@webstudio-is/project-build/runtime";
import { fetch } from "./fetch.client";
import { getResourceKey } from "./resource-utils";
import { type AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import { separateResourceDiagnostics } from "./resource-diagnostics";
import type { ResourcePerformance } from "./resource-diagnostics";

const MAX_PENDING_RESOURCES = 5;

type InFlightResourceBatch = {
  controller: AbortController;
  versions: Map<string, number>;
};

export { getResourceKey };

const queue = new Map<string, ResourceRequest>();
const pending = new Map<string, InFlightResourceBatch>();
const cache = new Map<string, unknown>();
const diagnosticsCache = new Map<string, AssetQueryPreviewDiagnostics>();
const performanceCache = new Map<string, ResourcePerformance>();
const pendingDiagnostics = new Map<string, Promise<void>>();
const knownRequests = new Map<string, ResourceRequest>();
const resourceVersions = new Map<string, number>();
const inFlightBatches = new Set<InFlightResourceBatch>();

export const $resourcesCache = atom(cache);
export const $resourceDiagnosticsCache = atom(diagnosticsCache);
export const $resourcePerformanceCache = atom(performanceCache);

const updateCache = () => {
  $resourcesCache.set(new Map(cache));
  $resourceDiagnosticsCache.set(new Map(diagnosticsCache));
  $resourcePerformanceCache.set(new Map(performanceCache));
};

const $pendingUpdater = atom({});

const updatePending = () => {
  $pendingUpdater.set({});
};

export const $hasPendingResources = computed(
  $pendingUpdater,
  () => queue.size > 0 || pending.size > 0
);

const loadResources = async (requestFetch: typeof fetch = fetch) => {
  const availableSlots = MAX_PENDING_RESOURCES - pending.size;
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
      const separated = separateResourceDiagnostics({ request, result });
      cache.set(key, separated.result);
      performanceCache.set(key, {
        ...separated.performance,
        loaderDurationMs,
      });
      if (separated.diagnostics === undefined) {
        diagnosticsCache.delete(key);
      } else {
        diagnosticsCache.set(key, separated.diagnostics);
      }
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
  if (pending.size >= MAX_PENDING_RESOURCES || queue.size === 0) {
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
  performanceCache.delete(key);
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
    updateCache();
  }
  if (pendingChanged) {
    updatePending();
  }
  for (const resource of resources) {
    preloadResource(resource);
  }
};

export const preloadResources = (resources: readonly ResourceRequest[]) => {
  queueResources(resources);
  startLoading();
};

const invalidateAndQueueResource = (resource: ResourceRequest) => {
  const key = getResourceKey(resource);
  cache.delete(key);
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
    return existing;
  }
  const version = resourceVersions.get(key) ?? 0;
  const promise = (async () => {
    try {
      const response = await requestFetch(
        restResourcesLoader({ diagnostics: true }),
        {
          method: "POST",
          body: JSON.stringify([resource]),
        }
      );
      if (response.ok === false) {
        return;
      }
      const result = new Map<string, unknown>(await response.json()).get(key);
      const { diagnostics } = separateResourceDiagnostics({
        request: resource,
        result,
      });
      if ((resourceVersions.get(key) ?? 0) !== version) {
        return;
      }
      if (diagnostics === undefined) {
        diagnosticsCache.delete(key);
      } else {
        diagnosticsCache.set(key, diagnostics);
      }
      updateCache();
    } catch {
      console.error("Resource diagnostics request failed");
    } finally {
      if ((resourceVersions.get(key) ?? 0) === version) {
        pendingDiagnostics.delete(key);
      }
    }
  })();
  pendingDiagnostics.set(key, promise);
  return promise;
};

/**
 * Invalidate the assets system resource.
 * Call this when assets are uploaded, deleted, or modified to refresh expressions using assets.
 */
export const invalidateAssets = () => {
  for (const request of knownRequests.values()) {
    if (isAssetsResourceRequest(request) === false) {
      continue;
    }
    invalidateAndQueueResource(request);
  }
  abortObsoleteBatches();
  updateCache();
  updatePending();
  startLoading();
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

const reset = () => {
  for (const batch of inFlightBatches) {
    batch.controller.abort();
  }
  inFlightBatches.clear();
  queue.clear();
  pending.clear();
  cache.clear();
  diagnosticsCache.clear();
  performanceCache.clear();
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
