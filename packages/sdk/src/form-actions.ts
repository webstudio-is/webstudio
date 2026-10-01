import { z } from "zod";
import { resolveResources } from "@webstudio-is/content-engine";
import type { ResourceRequest } from "./schema/resources";
import {
  loadResource,
  resourceLoadConcurrency,
  type ResourceRequestGraph,
} from "./resource-loader";

/** Only forward visitor metadata, never the site's cookies or credentials. */
export const getFormSubmissionHeaders = (
  request: Request,
  clientAddress?: string
) => {
  const headers: Array<{ name: string; value: string }> = [];
  for (const name of ["User-Agent", "Accept-Language"]) {
    const value = request.headers.get(name);
    if (value) {
      headers.push({ name, value });
    }
  }
  // The runtime's navigator identifies Workers; the incoming User-Agent does not.
  // Remix reconstructs Request objects and can drop request.cf before actions.
  // https://developers.cloudflare.com/workers/configuration/compatibility-flags/#global-navigator
  if (
    clientAddress === undefined &&
    typeof navigator !== "undefined" &&
    navigator.userAgent === "Cloudflare-Workers"
  ) {
    clientAddress = request.headers.get("CF-Connecting-IP") ?? undefined;
  }
  const address = z.union([z.ipv4(), z.ipv6()]).safeParse(clientAddress);
  if (address.success) {
    headers.push({ name: "X-Forwarded-For", value: address.data });
  }
  return headers;
};

export type FormAction =
  | { id: string; outputName: string }
  | { resourceIds: string[]; includeEmail: boolean };

/** Normalizes old forms without changing their saved configuration. */
export const getFormActionGroup = (action: FormAction | undefined) => {
  if (action === undefined) {
    return { resourceIds: [], includeEmail: true };
  }
  if ("id" in action) {
    return { resourceIds: [action.id], includeEmail: false };
  }
  return action;
};

const failedAction = () => ({
  ok: false,
  status: 502,
  statusText: "Form action failed",
  data: undefined,
});

/**
 * Validate the complete graph before sending, then settle every action.
 * Dependencies are shared within the submission; mutations always bypass caches.
 */
export const submitFormActions = async ({
  graph,
  resourceIds,
  emailRequest,
  body,
  baseUrl,
  dependencyFetch,
  actionFetch,
  timeoutMs = 30_000,
  submissionHeaders = [],
}: {
  graph: ResourceRequestGraph;
  resourceIds: readonly string[];
  emailRequest?: ResourceRequest;
  body: unknown;
  baseUrl: URL;
  dependencyFetch: typeof fetch;
  actionFetch: typeof fetch;
  timeoutMs?: number;
  submissionHeaders?: ResourceRequest["headers"];
}) => {
  if (new Set(resourceIds).size !== resourceIds.length) {
    throw new Error("Duplicate form action");
  }
  const rootIds = [...resourceIds];
  const requests = [...graph.resources];
  const mutationIds = new Set(resourceIds);
  if (emailRequest !== undefined) {
    let emailId = "email";
    const ids = new Set([
      ...resourceIds,
      ...requests.flatMap(({ id, dependencies }) => [id, ...dependencies]),
    ]);
    while (ids.has(emailId)) {
      emailId += "_";
    }
    rootIds.push(emailId);
    mutationIds.add(emailId);
    requests.push({
      id: emailId,
      outputName: emailId,
      dependencies: [],
      createRequest: () => emailRequest,
    });
  }
  if (rootIds.length === 0) {
    throw new Error("No form actions configured");
  }
  const { roots } = await resolveResources<{ ok: boolean }>({
    rootIds,
    concurrency: resourceLoadConcurrency,
    resources: requests.map((resource) => ({
      id: resource.id,
      dependencies: resource.dependencies,
      resolve: async ({ documents }) => {
        try {
          for (const dependencyId of resource.dependencies) {
            if (documents.get(dependencyId)?.ok !== true) {
              return failedAction();
            }
          }
          let request = resource.createRequest(documents);
          if (resourceIds.includes(resource.id)) {
            const configuredNames = new Set(
              request.headers.map(({ name }) => name.toLowerCase())
            );
            request = {
              ...request,
              body,
              headers: [
                ...request.headers,
                ...submissionHeaders.filter(
                  ({ name }) => !configuredNames.has(name.toLowerCase())
                ),
              ],
            };
          }
          return await loadResource(
            mutationIds.has(resource.id) ? actionFetch : dependencyFetch,
            request,
            baseUrl,
            { timeoutMs }
          );
        } catch {
          // A request expression can fail before fetch. Keep sibling actions
          // running and never send private configuration back to the browser.
          return failedAction();
        }
      },
    })),
  });
  if (roots.every(({ ok }) => ok)) {
    return { success: true as const };
  }
  return {
    success: false as const,
    partialSuccess: roots.some(({ ok }) => ok),
    errors: ["One or more form actions failed"],
  };
};
