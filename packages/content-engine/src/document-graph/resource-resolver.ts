import { awaitWithSignal, createConcurrencyLimiter } from "../async-utils";

export type Resource<Document> = Readonly<{
  id: string;
  dependencies: readonly string[];
  resolve: (input: {
    documents: ReadonlyMap<string, Document>;
    signal?: AbortSignal;
  }) => Document | Promise<Document>;
}>;

export type ResourceResolutionErrorCode =
  | "DUPLICATE_RESOURCE"
  | "ROOT_NOT_FOUND"
  | "DEPENDENCY_NOT_FOUND"
  | "CYCLE"
  | "REQUEST_CANCELLED"
  | "RESOLUTION_FAILED";

export class ResourceResolutionError extends Error {
  readonly code: ResourceResolutionErrorCode;
  readonly resourceIds: readonly string[];

  constructor({
    code,
    message,
    resourceIds = [],
    cause,
  }: {
    code: ResourceResolutionErrorCode;
    message: string;
    resourceIds?: readonly string[];
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "ResourceResolutionError";
    this.code = code;
    this.resourceIds = Object.freeze([...resourceIds]);
  }
}

export type ResolvedResources<Document> = Readonly<{
  roots: readonly Document[];
  documents: ReadonlyMap<string, Document>;
}>;

const assertActive = (signal: AbortSignal | undefined) => {
  if (signal?.aborted) {
    throw new ResourceResolutionError({
      code: "REQUEST_CANCELLED",
      message: "Resource resolution was cancelled",
      cause: signal.reason,
    });
  }
};

const getReachableResources = <Document>({
  resourcesById,
  rootIds,
}: {
  resourcesById: ReadonlyMap<string, Resource<Document>>;
  rootIds: readonly string[];
}) => {
  const state = new Map<string, "visiting" | "visited">();
  const stack: string[] = [];
  const ordered: Resource<Document>[] = [];

  const visit = (resourceId: string, sourceId?: string) => {
    const resource = resourcesById.get(resourceId);
    if (resource === undefined) {
      throw new ResourceResolutionError({
        code:
          sourceId === undefined ? "ROOT_NOT_FOUND" : "DEPENDENCY_NOT_FOUND",
        message:
          sourceId === undefined
            ? `Resource graph root ${resourceId} does not exist`
            : `Resource ${sourceId} dependency ${resourceId} does not exist`,
        resourceIds:
          sourceId === undefined ? [resourceId] : [sourceId, resourceId],
      });
    }
    const resourceState = state.get(resourceId);
    if (resourceState === "visited") {
      return;
    }
    if (resourceState === "visiting") {
      const cycleStart = stack.indexOf(resourceId);
      const cycle = [...stack.slice(cycleStart), resourceId];
      throw new ResourceResolutionError({
        code: "CYCLE",
        message: `Resource graph contains a cycle: ${cycle.join(" -> ")}`,
        resourceIds: cycle,
      });
    }
    state.set(resourceId, "visiting");
    stack.push(resourceId);
    for (const dependencyId of resource.dependencies) {
      visit(dependencyId, resource.id);
    }
    stack.pop();
    state.set(resourceId, "visited");
    ordered.push(resource);
  };

  for (const rootId of new Set(rootIds)) {
    visit(rootId);
  }
  return ordered;
};

/** Resolves only requested resources and their transitive dependencies. */
export const resolveResources = async <Document>({
  resources,
  rootIds,
  concurrency,
  signal,
}: {
  resources: Iterable<Resource<Document>>;
  rootIds: readonly string[];
  concurrency: number;
  signal?: AbortSignal;
}): Promise<ResolvedResources<Document>> => {
  if (Number.isSafeInteger(concurrency) === false || concurrency <= 0) {
    throw new TypeError("Resource resolution concurrency must be positive");
  }
  assertActive(signal);
  const resourcesById = new Map<string, Resource<Document>>();
  for (const resource of resources) {
    if (resourcesById.has(resource.id)) {
      throw new ResourceResolutionError({
        code: "DUPLICATE_RESOURCE",
        message: `Resource graph contains duplicate resource ${resource.id}`,
        resourceIds: [resource.id],
      });
    }
    resourcesById.set(resource.id, resource);
  }
  const reachableResources = getReachableResources({
    resourcesById,
    rootIds,
  });
  const limit = createConcurrencyLimiter({ concurrency, signal });
  const documents = new Map<string, Document>();
  const pending = new Map<string, Promise<Document>>();

  const resolveResource = (resourceId: string): Promise<Document> => {
    const previous = pending.get(resourceId);
    if (previous !== undefined) {
      return previous;
    }
    const resource = resourcesById.get(resourceId) as Resource<Document>;
    const resolution = (async () => {
      const dependencyDocuments = new Map<string, Document>();
      let dependencyValues: Document[];
      try {
        dependencyValues = await Promise.all(
          resource.dependencies.map(resolveResource)
        );
      } catch (cause) {
        if (
          cause instanceof ResourceResolutionError &&
          cause.code === "RESOLUTION_FAILED"
        ) {
          throw new ResourceResolutionError({
            code: cause.code,
            message: `Resource dependency path ${[
              resource.id,
              ...cause.resourceIds,
            ].join(" -> ")} could not be resolved`,
            resourceIds: [resource.id, ...cause.resourceIds],
            cause: cause.cause,
          });
        }
        throw cause;
      }
      for (const [index, dependencyId] of resource.dependencies.entries()) {
        dependencyDocuments.set(
          dependencyId,
          dependencyValues[index] as Document
        );
      }
      assertActive(signal);
      try {
        return await limit(async () => {
          assertActive(signal);
          const document = await awaitWithSignal(
            resource.resolve({
              documents: dependencyDocuments,
              signal,
            }),
            signal
          );
          assertActive(signal);
          return document;
        });
      } catch (cause) {
        if (signal?.aborted) {
          assertActive(signal);
        }
        if (cause instanceof ResourceResolutionError) {
          throw cause;
        }
        throw new ResourceResolutionError({
          code: "RESOLUTION_FAILED",
          message: `Resource ${resource.id} could not be resolved`,
          resourceIds: [resource.id],
          cause,
        });
      }
    })();
    pending.set(resourceId, resolution);
    return resolution;
  };

  const roots = await Promise.all(rootIds.map(resolveResource));
  for (const resource of reachableResources) {
    const document = await pending.get(resource.id);
    documents.set(resource.id, document as Document);
  }
  return Object.freeze({
    roots: Object.freeze(roots),
    documents,
  });
};
