import { z } from "zod";
import {
  builderNamespaces,
  type BuilderNamespace,
} from "../contracts/namespaces";
import type { BuilderState } from "../state/builder-state";
import { getInstanceDepths } from "./instances";
import { paginateOutput, paginatedOutputInputSchema } from "./output";
import {
  findSerializedPageByInput,
  getSerializedPagePath,
  getSerializedPages,
} from "./pages";
import { validatePageSelector } from "./page-selector";

const projectLookupScope = z.enum([
  "instances",
  "text",
  "props",
  "resources",
  "assets",
  "styles",
]);

const builderNamespace = z.enum(builderNamespaces);

export const projectSearchInput = z
  .object({
    query: z.string().min(1),
    namespaces: z
      .array(builderNamespace)
      .min(1)
      .optional()
      .describe(
        "Builder namespaces to search. Omit to search every namespace in the local project session."
      ),
    scopes: z
      .array(projectLookupScope)
      .min(1)
      .optional()
      .describe(
        "Deprecated semantic namespace groups. Use namespaces for new workflows."
      ),
    pageId: z.string().optional(),
    pagePath: z.string().optional(),
    ...paginatedOutputInputSchema.shape,
  })
  .strict()
  .superRefine(validatePageSelector)
  .superRefine((input, context) => {
    if (input.namespaces !== undefined && input.scopes !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["namespaces"],
        message: "Use namespaces or scopes, not both.",
      });
    }
  });

type SearchPath = Array<string | number>;
type SearchValue = string | number | boolean | null;

const scopeNamespaces = {
  instances: ["instances"],
  text: ["instances"],
  props: ["props"],
  resources: ["resources"],
  assets: ["assets"],
  styles: ["styles", "styleSources", "styleSourceSelections", "breakpoints"],
} as const satisfies Record<
  z.infer<typeof projectLookupScope>,
  readonly BuilderNamespace[]
>;

const getSelectedNamespaces = (
  input: z.infer<typeof projectSearchInput>
): BuilderNamespace[] => {
  if (input.namespaces !== undefined) {
    const selected = new Set(input.namespaces);
    return builderNamespaces.filter((namespace) => selected.has(namespace));
  }
  if (input.scopes !== undefined) {
    const selected = new Set<BuilderNamespace>(
      input.scopes.flatMap((scope) => scopeNamespaces[scope])
    );
    return builderNamespaces.filter((namespace) => selected.has(namespace));
  }
  return [...builderNamespaces];
};

const visitSearchValues = (
  value: unknown,
  path: SearchPath,
  visit: (value: SearchValue, path: SearchPath) => void,
  ancestors = new Set<object>()
) => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    visit(value, path);
    return;
  }
  if (typeof value !== "object" || ancestors.has(value)) {
    return;
  }
  const nextAncestors = new Set(ancestors).add(value);
  if (value instanceof Map) {
    for (const [key, child] of value) {
      visitSearchValues(child, [...path, String(key)], visit, nextAncestors);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      visitSearchValues(child, [...path, index], visit, nextAncestors)
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    visitSearchValues(child, [...path, key], visit, nextAncestors);
  }
};

const entityTypes: Partial<Record<BuilderNamespace, string>> = {
  instances: "instance",
  props: "prop",
  styles: "style",
  styleSources: "styleSource",
  styleSourceSelections: "styleSourceSelection",
  dataSources: "dataSource",
  resources: "resource",
  assets: "asset",
  assetFolders: "assetFolder",
  breakpoints: "breakpoint",
};

const getEntity = (namespace: BuilderNamespace, path: SearchPath) => {
  if (namespace === "pages") {
    if (path[0] === "pages" && typeof path[1] === "string") {
      return { type: "page", id: path[1] };
    }
    if (path[0] === "folders" && typeof path[1] === "string") {
      return { type: "folder", id: path[1] };
    }
    if (path[0] === "pageTemplates" && typeof path[1] === "string") {
      return { type: "pageTemplate", id: path[1] };
    }
    return { type: "project", id: "project" };
  }
  const type = entityTypes[namespace];
  if (type !== undefined && typeof path[0] === "string") {
    return { type, id: path[0] };
  }
  return { type: "project", id: "project" };
};

const hasReference = (
  state: BuilderState,
  namespace: BuilderNamespace,
  id: string
) => state[namespace] instanceof Map && state[namespace].has(id);

const getReference = ({
  state,
  namespace,
  path,
  value,
}: {
  state: BuilderState;
  namespace: BuilderNamespace;
  path: SearchPath;
  value: SearchValue;
}) => {
  if (typeof value !== "string") {
    return;
  }
  let target: BuilderNamespace | undefined;
  const field = path.at(-1);
  if (namespace === "props" && field === "value") {
    const prop = state.props?.get(String(path[0]));
    if (prop?.type === "asset") {
      target = "assets";
    } else if (prop?.type === "resource") {
      target = "resources";
    }
  } else if (namespace === "dataSources" && field === "resourceId") {
    target = "resources";
  } else if (namespace === "styles" && field === "styleSourceId") {
    target = "styleSources";
  } else if (namespace === "styles" && field === "breakpointId") {
    target = "breakpoints";
  } else if (
    namespace === "styleSourceSelections" &&
    path.at(-2) === "values"
  ) {
    target = "styleSources";
  } else if (namespace === "assets" && field === "folderId") {
    target = "assetFolders";
  } else if (namespace === "assetFolders" && field === "parentId") {
    target = "assetFolders";
  } else if (namespace === "pages" && field === "rootInstanceId") {
    target = "instances";
  } else if (namespace === "pages" && field === "socialImageAssetId") {
    target = "assets";
  } else if (
    namespace === "marketplaceProduct" &&
    field === "thumbnailAssetId"
  ) {
    target = "assets";
  }
  if (target === undefined) {
    return;
  }
  return {
    namespace: target,
    id: value,
    resolved: hasReference(state, target, value),
  };
};

const getPageContext = (state: BuilderState) => {
  if (state.pages === undefined) {
    return {
      pageIds: [] as string[],
      pagePaths: new Map<string, string>(),
      instancePageIds: new Map<string, Set<string>>(),
    };
  }
  const serializedPages = getSerializedPages(state);
  const pageIds = serializedPages.pages.map((page) => page.id);
  const pagePaths = new Map(
    serializedPages.pages.map((page) => [
      page.id,
      getSerializedPagePath(serializedPages, page) || "/",
    ])
  );
  const instancePageIds = new Map<string, Set<string>>();
  if (state.instances !== undefined) {
    for (const page of serializedPages.pages) {
      for (const instanceId of getInstanceDepths(state.instances, [
        page.rootInstanceId,
      ]).keys()) {
        const pages = instancePageIds.get(instanceId) ?? new Set<string>();
        pages.add(page.id);
        instancePageIds.set(instanceId, pages);
      }
    }
  }
  return { pageIds, pagePaths, instancePageIds };
};

const getAffectedPageIds = ({
  state,
  namespace,
  path,
  allPageIds,
  instancePageIds,
}: {
  state: BuilderState;
  namespace: BuilderNamespace;
  path: SearchPath;
  allPageIds: string[];
  instancePageIds: Map<string, Set<string>>;
}): string[] => {
  const fromInstance = (instanceId: string | undefined) =>
    instanceId === undefined
      ? []
      : Array.from(instancePageIds.get(instanceId) ?? []);
  if (namespace === "pages") {
    if (path[0] === "pages" && typeof path[1] === "string") {
      return [path[1]];
    }
    return allPageIds;
  }
  if (namespace === "projectSettings" || namespace === "marketplaceProduct") {
    return allPageIds;
  }
  const recordId = typeof path[0] === "string" ? path[0] : undefined;
  if (namespace === "instances" || namespace === "styleSourceSelections") {
    return fromInstance(recordId);
  }
  if (namespace === "props") {
    return fromInstance(recordId && state.props?.get(recordId)?.instanceId);
  }
  if (namespace === "dataSources") {
    return fromInstance(
      recordId && state.dataSources?.get(recordId)?.scopeInstanceId
    );
  }
  if (namespace === "resources") {
    const ids = new Set<string>();
    for (const dataSource of state.dataSources?.values() ?? []) {
      if (
        dataSource.type === "resource" &&
        dataSource.resourceId === recordId
      ) {
        for (const id of fromInstance(dataSource.scopeInstanceId)) {
          ids.add(id);
        }
      }
    }
    for (const prop of state.props?.values() ?? []) {
      if (prop.type === "resource" && prop.value === recordId) {
        for (const id of fromInstance(prop.instanceId)) {
          ids.add(id);
        }
      }
    }
    return Array.from(ids);
  }
  const pageIdsForStyleSource = (styleSourceId: string | undefined) => {
    const ids = new Set<string>();
    if (styleSourceId === undefined) {
      return [];
    }
    for (const selection of state.styleSourceSelections?.values() ?? []) {
      if (selection.values.includes(styleSourceId)) {
        for (const id of fromInstance(selection.instanceId)) {
          ids.add(id);
        }
      }
    }
    return Array.from(ids);
  };
  if (namespace === "styleSources") {
    return pageIdsForStyleSource(recordId);
  }
  if (namespace === "styles") {
    return pageIdsForStyleSource(
      recordId && state.styles?.get(recordId)?.styleSourceId
    );
  }
  if (namespace === "breakpoints") {
    const ids = new Set<string>();
    for (const declaration of state.styles?.values() ?? []) {
      if (declaration.breakpointId === recordId) {
        for (const id of pageIdsForStyleSource(declaration.styleSourceId)) {
          ids.add(id);
        }
      }
    }
    return Array.from(ids);
  }
  if (namespace === "assets") {
    const ids = new Set<string>();
    for (const prop of state.props?.values() ?? []) {
      if (prop.type === "asset" && prop.value === recordId) {
        for (const id of fromInstance(prop.instanceId)) {
          ids.add(id);
        }
      }
    }
    for (const page of state.pages?.pages.values() ?? []) {
      if (page.meta.socialImageAssetId === recordId) {
        ids.add(page.id);
      }
    }
    return Array.from(ids);
  }
  if (namespace === "assetFolders") {
    const ids = new Set<string>();
    for (const asset of state.assets?.values() ?? []) {
      if (asset.folderId !== recordId) {
        continue;
      }
      for (const prop of state.props?.values() ?? []) {
        if (prop.type === "asset" && prop.value === asset.id) {
          for (const id of fromInstance(prop.instanceId)) {
            ids.add(id);
          }
        }
      }
    }
    return Array.from(ids);
  }
  return [];
};

export const searchProject = (
  state: BuilderState,
  input: z.infer<typeof projectSearchInput>
) => {
  const namespaces = getSelectedNamespaces(input);
  const query = input.query.toLocaleLowerCase();
  const pageContext = getPageContext(state);
  const selectedPage =
    input.pageId === undefined && input.pagePath === undefined
      ? undefined
      : findSerializedPageByInput(getSerializedPages(state), input);
  const matches: Array<{
    matchId: string;
    kind: "value";
    currentValue: SearchValue;
    entity: { type: string; id: string };
    location: { namespace: BuilderNamespace; path: SearchPath };
    pageIds: string[];
    pagePaths: string[];
    reference?: {
      namespace: BuilderNamespace;
      id: string;
      resolved: boolean;
    };
  }> = [];
  for (const namespace of namespaces) {
    visitSearchValues(state[namespace], [], (currentValue, path) => {
      if (String(currentValue).toLocaleLowerCase().includes(query) === false) {
        return;
      }
      const pageIds = getAffectedPageIds({
        state,
        namespace,
        path,
        allPageIds: pageContext.pageIds,
        instancePageIds: pageContext.instancePageIds,
      });
      if (
        selectedPage !== undefined &&
        pageIds.includes(selectedPage.id) === false
      ) {
        return;
      }
      matches.push({
        matchId: `project-match:v1:${JSON.stringify([namespace, ...path])}`,
        kind: "value",
        currentValue,
        entity: getEntity(namespace, path),
        location: { namespace, path },
        pageIds,
        pagePaths: pageIds.flatMap((id) => {
          const pagePath = pageContext.pagePaths.get(id);
          return pagePath === undefined ? [] : [pagePath];
        }),
        reference: getReference({
          state,
          namespace,
          path,
          value: currentValue,
        }),
      });
    });
  }
  const { items, ...pagination } = paginateOutput({
    items: matches,
    cursor: input.cursor,
    limit: input.limit,
    filters: {
      query: input.query,
      namespaces,
      scopes: input.scopes,
      pageId: input.pageId,
      pagePath: input.pagePath,
    },
    verbose: input.verbose,
  });
  return {
    query: input.query,
    namespaces,
    scopes: input.scopes ?? [],
    matches: items,
    truncated: pagination.nextCursor !== null,
    ...pagination,
  };
};
