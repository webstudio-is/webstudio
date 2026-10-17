import { defaultEmailSubject } from "../email-resource";
import { parseEmailMailboxes } from "../email-addresses";
import {
  getResourceCacheKey,
  isLocalResource,
  type ResourceRequestGraph,
} from "../resource-loader";
import type { ManagedFormResourceGraph } from "./server-submission";
import {
  formBotFieldName,
  formIdFieldName,
  managedFormArrayNamesFieldName,
  managedFormIdFieldName,
} from "./fields";

/** Convert a published Webhook Form submission to the Form handler's input. */
export const adaptLegacyFormSubmission = ({
  formData,
  action,
  resources,
  contactEmail,
  url,
}: {
  formData: FormData;
  action?: { id: string; outputName: string };
  resources: ResourceRequestGraph;
  contactEmail?: string;
  url: URL;
}) => {
  const adapted = new FormData();
  const counts = new Map<string, number>();
  for (const [name, value] of formData) {
    if (
      name === formIdFieldName ||
      name === managedFormIdFieldName ||
      name === managedFormArrayNamesFieldName
    ) {
      continue;
    }
    adapted.append(name, value);
    if (name !== formBotFieldName) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  adapted.set(managedFormIdFieldName, "legacy");
  adapted.set(
    managedFormArrayNamesFieldName,
    JSON.stringify(
      Array.from(counts)
        .filter(([, count]) => count > 1)
        .map(([name]) => name)
    )
  );
  // A per-submission marker identifies dependencies at the transport boundary.
  // It is removed before a request reaches any destination.
  const dependencyHeader = `x-webstudio-legacy-dependency-${crypto.randomUUID()}`;

  let graph: ManagedFormResourceGraph;
  if (action === undefined) {
    if (contactEmail === undefined) {
      throw new Error("Contact email not found");
    }
    const recipients = parseEmailMailboxes(contactEmail);
    if (recipients === undefined || recipients.length === 0) {
      throw new Error("Email settings are invalid");
    }
    const lines: string[] = [];
    for (const [name, value] of formData) {
      if (
        name !== formIdFieldName &&
        name !== formBotFieldName &&
        typeof value === "string"
      ) {
        lines.push(`${name}: ${value}`);
      }
    }
    graph = {
      rootIds: ["legacy-email"],
      resources: [
        {
          id: "legacy-email",
          outputName: "legacy-email",
          name: "Email",
          dependencies: [],
          control: "email",
          emailRecipientCount: recipients.length,
          createRequest: () => ({
            name: "Email",
            control: "email",
            method: "post",
            url: "",
            searchParams: [],
            headers: [],
            email: {
              recipientMode: "project",
              recipients,
              subject: `${defaultEmailSubject} from ${url.hostname}`,
              body: `There has been a new submission of your form at ${url}:\n\n${lines.join("\n")}${lines.length > 0 ? "\n" : ""}`,
              includeAttachments: true,
            },
          }),
        },
      ],
    };
  } else {
    const resourcesById = new Map(
      resources.resources.map((resource) => [resource.id, resource])
    );
    const reachableIds = new Set<string>();
    const visit = (id: string) => {
      if (reachableIds.has(id)) {
        return;
      }
      const resource = resourcesById.get(id);
      if (resource === undefined) {
        throw new Error("Resource not found");
      }
      reachableIds.add(id);
      for (const dependencyId of resource.dependencies) {
        visit(dependencyId);
      }
    };
    visit(action.id);
    graph = {
      rootIds: [action.id],
      resources: resources.resources
        .filter((resource) => reachableIds.has(resource.id))
        .map((resource) =>
          resource.id === action.id
            ? {
                ...resource,
                createRequest: (documents: ReadonlyMap<string, unknown>) => ({
                  ...resource.createRequest(documents),
                  body: Object.fromEntries(
                    Array.from(adapted).filter(
                      ([name]) =>
                        name !== managedFormIdFieldName &&
                        name !== managedFormArrayNamesFieldName &&
                        name !== formBotFieldName
                    )
                  ),
                }),
              }
            : {
                ...resource,
                createRequest: (documents: ReadonlyMap<string, unknown>) => {
                  const request = resource.createRequest(documents);
                  return {
                    ...request,
                    headers: [
                      ...request.headers,
                      { name: dependencyHeader, value: "1" },
                    ],
                  };
                },
              }
        ),
    };
  }
  return { formData: adapted, graph, dependencyHeader };
};

/** Keep legacy opt-in dependency caching while using protected outbound fetch. */
export const createLegacyFormResourceFetch =
  ({
    protectedFetch,
    localFetch,
    dependencyHeader,
    projectId,
  }: {
    protectedFetch: typeof fetch & { validateDestination: (url: URL) => void };
    localFetch: typeof fetch;
    dependencyHeader: string;
    projectId: string;
  }): typeof fetch =>
  async (input, init) => {
    if (typeof input === "string" && isLocalResource(input)) {
      const headers = new Headers(init?.headers);
      headers.delete(dependencyHeader);
      return localFetch(input, { ...init, headers });
    }
    const request = new Request(input, init);
    const isDependency = request.headers.has(dependencyHeader);
    request.headers.delete(dependencyHeader);
    protectedFetch.validateDestination(new URL(request.url));
    if (
      !isDependency ||
      !request.headers.get("Cache-Control") ||
      !globalThis.caches
    ) {
      return protectedFetch(request);
    }
    request.signal.throwIfAborted();
    const cache = await caches.open(projectId);
    request.signal.throwIfAborted();
    const cacheKey = await getResourceCacheKey(request);
    request.signal.throwIfAborted();
    const cached = await cache.match(cacheKey);
    request.signal.throwIfAborted();
    if (cached !== undefined) {
      return new Response(cached.body, cached);
    }
    let response = await protectedFetch(request);
    if (!response.ok) {
      return response;
    }
    response = new Response(response.body, response);
    response.headers.set(
      "Cache-Control",
      request.headers.get("Cache-Control")!
    );
    await cache.put(cacheKey, response.clone());
    request.signal.throwIfAborted();
    return response;
  };
