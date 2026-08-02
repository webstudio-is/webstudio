import { atom, computed } from "nanostores";
import type { DataSource, Resource, ResourceRequest } from "@webstudio-is/sdk";
import { isAssetsResourceRequest } from "@webstudio-is/sdk/runtime";
import { restResourcesLoader } from "./router-utils";
import { computeExpression } from "@webstudio-is/project-build/runtime";
import { fetch } from "./fetch.client";
import { getResourceKey } from "./resource-utils";
import { type AssetQueryPreviewDiagnostics } from "@webstudio-is/content-engine";
import { separateResourceDiagnostics } from "./resource-diagnostics";

const MAX_PENDING_RESOURCES = 5;

export { getResourceKey };

const queue = new Map<string, ResourceRequest>();
const pending = new Map<string, ResourceRequest>();
const cache = new Map<string, unknown>();
const diagnosticsCache = new Map<string, AssetQueryPreviewDiagnostics>();
const knownRequests = new Map<string, ResourceRequest>();

export const $resourcesCache = atom(cache);
export const $resourceDiagnosticsCache = atom(diagnosticsCache);

const updateCache = () => {
  $resourcesCache.set(new Map(cache));
  $resourceDiagnosticsCache.set(new Map(diagnosticsCache));
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
  const list = Array.from(queue.values()).slice(0, MAX_PENDING_RESOURCES);
  const dispatched = new Map<string, ResourceRequest>();
  for (const resource of list) {
    const key = getResourceKey(resource);
    queue.delete(key);
    pending.set(key, resource);
    dispatched.set(key, resource);
  }
  updatePending();

  try {
    const response = await requestFetch(restResourcesLoader(), {
      method: "POST",
      body: JSON.stringify(list),
    });
    if (response.ok === false) {
      return;
    }
    const results = new Map<string, unknown>(await response.json());
    for (const [key, result] of results) {
      const request = dispatched.get(key);
      if (request === undefined || knownRequests.has(key) === false) {
        continue;
      }
      const separated = separateResourceDiagnostics({ request, result });
      cache.set(key, separated.result);
      if (separated.diagnostics === undefined) {
        diagnosticsCache.delete(key);
      } else {
        diagnosticsCache.set(key, separated.diagnostics);
      }
    }
  } catch {
    console.error("Resource batch request failed");
  } finally {
    for (const [key, request] of dispatched) {
      if (pending.get(key) === request) {
        pending.delete(key);
      }
    }
    updateCache();
    updatePending();
    // Restart loading until the queue is empty. An invalidation may have
    // queued a fresh request while this batch was pending.
    scheduleLoading();
  }
};

let timeoutId: undefined | number;

const scheduleLoading = () => {
  // scheduling will be restarted after finishing pending one
  // skip when there is nothing in queue
  if (pending.size > 0 || queue.size === 0) {
    return;
  }
  window.clearTimeout(timeoutId);
  timeoutId = window.setTimeout(loadResources, 0);
};

const preloadResource = (resource: ResourceRequest) => {
  const key = getResourceKey(resource);
  knownRequests.set(key, resource);
  if (queue.has(key) || pending.has(key) || cache.has(key)) {
    return;
  }
  // deduplicate resources in queue
  queue.set(key, resource);
  updatePending();
};

export const preloadResources = (resources: readonly ResourceRequest[]) => {
  const currentKeys = new Set(resources.map(getResourceKey));
  let pendingChanged = false;
  for (const key of knownRequests.keys()) {
    if (currentKeys.has(key) === false) {
      knownRequests.delete(key);
      pendingChanged = queue.delete(key) || pendingChanged;
    }
  }
  if (pendingChanged) {
    updatePending();
  }
  for (const resource of resources) {
    preloadResource(resource);
  }
  scheduleLoading();
};

export const invalidateResource = (resource: ResourceRequest) => {
  const key = getResourceKey(resource);
  cache.delete(key);
  diagnosticsCache.delete(key);
  preloadResource(resource);
  scheduleLoading();
};

/**
 * Invalidate the assets system resource.
 * Call this when assets are uploaded, deleted, or modified to refresh expressions using assets.
 */
export const invalidateAssets = () => {
  for (const [key, request] of knownRequests) {
    if (isAssetsResourceRequest(request) === false) {
      continue;
    }
    cache.delete(key);
    diagnosticsCache.delete(key);
    // Queue another load even when the previous request is still pending. The
    // pending load may contain the asset state from before this mutation.
    queue.set(key, request);
  }
  updateCache();
  updatePending();
  scheduleLoading();
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
  window.clearTimeout(timeoutId);
  timeoutId = undefined;
  queue.clear();
  pending.clear();
  cache.clear();
  diagnosticsCache.clear();
  knownRequests.clear();
  updateCache();
  updatePending();
};

export const __testing__ = { loadResources, reset };
