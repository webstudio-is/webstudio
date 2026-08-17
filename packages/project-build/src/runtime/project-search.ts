import { z } from "zod";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import {
  builderNamespaces,
  type BuilderNamespace,
} from "../contracts/namespaces";
import type { BuilderState } from "../state/builder-state";
import { calculateUsagesByAssetId } from "./assets";
import { throwBuilderRuntimeError } from "./errors";
import { getInstanceDepths } from "./instances";
import { paginateOutput, paginatedOutputInputSchema } from "./output";
import {
  findSerializedPageByInput,
  getSerializedPagePath,
  getSerializedPages,
} from "./pages";
import { validatePageSelector } from "./page-selector";
import { analyzeProject } from "./search";

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
type SearchMatchType = "value" | "key";
type SearchCandidate = {
  currentValue: SearchValue;
  matchType: SearchMatchType;
  path: SearchPath;
  stablePath: SearchPath;
};
type LegacySearchKind =
  | "instance"
  | "text"
  | "prop"
  | "resource"
  | "asset"
  | "design-token"
  | "style-source"
  | "css-variable"
  | "style"
  | "breakpoint";

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

const sensitiveNames = new Set([
  "auth",
  "authorization",
  "cookie",
  "password",
  "passphrase",
  "privatekey",
  "secret",
  "token",
  "accesstoken",
  "refreshtoken",
  "apikey",
  "servicerolekey",
]);

const normalizeName = (value: string) =>
  value.toLocaleLowerCase().replaceAll(/[^a-z0-9]/g, "");

const isSensitiveName = (value: unknown) => {
  if (typeof value !== "string") {
    return false;
  }
  const name = normalizeName(value);
  return (
    sensitiveNames.has(name) ||
    [
      "apikey",
      "authorization",
      "cookie",
      "password",
      "passphrase",
      "privatekey",
      "secret",
      "secretkey",
      "accesskey",
      "servicerolekey",
      "token",
    ].some((suffix) => name.endsWith(suffix))
  );
};

const countSearchValues = (
  value: unknown,
  ancestors = new Set<object>()
): number => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return 1;
  }
  if (typeof value !== "object" || ancestors.has(value)) {
    return 0;
  }
  const nextAncestors = new Set(ancestors).add(value);
  const children = value instanceof Map ? value.values() : Object.values(value);
  let total = 0;
  for (const child of children) {
    total += countSearchValues(child, nextAncestors);
  }
  return total;
};

const stableSerialize = (value: unknown): string => {
  if (value instanceof Map) {
    return stableSerialize(
      Object.fromEntries(
        [...value.entries()].sort(([a], [b]) =>
          String(a).localeCompare(String(b))
        )
      )
    );
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableSerialize(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? String(value);
};

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const getArrayAnchor = (child: unknown, duplicateIndex: number) => {
  if (child !== null && typeof child === "object") {
    const record = child as Record<string, unknown>;
    if (typeof record.id === "string") {
      return `id:${record.id}:${duplicateIndex}`;
    }
    if (record.type === "id" && typeof record.value === "string") {
      return `instance:${record.value}:${duplicateIndex}`;
    }
    if (typeof record.old === "string") {
      return `redirect:${record.old}:${duplicateIndex}`;
    }
    if (typeof record.name === "string") {
      return `name:${record.name}:${duplicateIndex}`;
    }
  }
  return `item:${hashString(stableSerialize(child))}:${duplicateIndex}`;
};

const getArrayAnchorBase = (child: unknown) => {
  if (child !== null && typeof child === "object") {
    const record = child as Record<string, unknown>;
    if (typeof record.id === "string") {
      return `id:${record.id}`;
    }
    if (record.type === "id" && typeof record.value === "string") {
      return `instance:${record.value}`;
    }
    if (typeof record.old === "string") {
      return `redirect:${record.old}`;
    }
    if (typeof record.name === "string") {
      return `name:${record.name}`;
    }
  }
  return `item:${hashString(stableSerialize(child))}`;
};

const visitSearchValues = (
  value: unknown,
  path: SearchPath,
  stablePath: SearchPath,
  visit: (candidate: SearchCandidate) => void,
  onSensitiveValue: (count: number) => void,
  { searchObjectKeys = false, ancestors = new Set<object>() } = {}
) => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    visit({ currentValue: value, matchType: "value", path, stablePath });
    return;
  }
  if (typeof value !== "object" || ancestors.has(value)) {
    return;
  }
  const nextAncestors = new Set(ancestors).add(value);
  if (value instanceof Map) {
    for (const [key, child] of value) {
      const segment = String(key);
      if (
        child === null ||
        typeof child !== "object" ||
        (child as Record<string, unknown>).id !== key
      ) {
        visit({
          currentValue: segment,
          matchType: "key",
          path: [...path, segment],
          stablePath: [...stablePath, segment],
        });
      }
      visitSearchValues(
        child,
        [...path, segment],
        [...stablePath, segment],
        visit,
        onSensitiveValue,
        {
          searchObjectKeys,
          ancestors: nextAncestors,
        }
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    const duplicateCounts = new Map<string, number>();
    value.forEach((child, index) => {
      const anchorBase = getArrayAnchorBase(child);
      const duplicateIndex = duplicateCounts.get(anchorBase) ?? 0;
      duplicateCounts.set(anchorBase, duplicateIndex + 1);
      visitSearchValues(
        child,
        [...path, index],
        [...stablePath, getArrayAnchor(child, duplicateIndex)],
        visit,
        onSensitiveValue,
        { searchObjectKeys, ancestors: nextAncestors }
      );
    });
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const namedValue = (value as Record<string, unknown>).name;
    const recordType = (value as Record<string, unknown>).type;
    if (
      isSensitiveName(key) ||
      (path.at(-1) === "auth" && (key === "login" || key === "password")) ||
      (key === "value" && isSensitiveName(namedValue))
    ) {
      onSensitiveValue(countSearchValues(child));
      continue;
    }
    if (searchObjectKeys) {
      visit({
        currentValue: key,
        matchType: "key",
        path: [...path, key],
        stablePath: [...stablePath, key],
      });
    }
    visitSearchValues(
      child,
      [...path, key],
      [...stablePath, key],
      visit,
      onSensitiveValue,
      {
        searchObjectKeys:
          searchObjectKeys || (key === "value" && recordType === "json"),
        ancestors: nextAncestors,
      }
    );
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
  entityType: string,
  id: string
) => {
  if (namespace !== "pages") {
    if (
      namespace === "instances" &&
      entityType === "root" &&
      id === ROOT_INSTANCE_ID
    ) {
      return true;
    }
    const records = state[namespace];
    return records instanceof Map && records.has(id);
  }
  if (entityType === "folder") {
    return state.pages?.folders.has(id) === true;
  }
  if (entityType === "pageTemplate") {
    return state.pages?.pageTemplates?.has(id) === true;
  }
  return state.pages?.pages.has(id) === true;
};

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
  let target: { namespace: BuilderNamespace; entityType: string } | undefined;
  const field = path.at(-1);
  const parentField = path.at(-2);
  const instanceChildIndex = path.at(-2);
  const instanceChild =
    namespace === "instances" && typeof instanceChildIndex === "number"
      ? state.instances?.get(String(path[0]))?.children[instanceChildIndex]
      : undefined;
  if (namespace === "props" && field === "instanceId") {
    target = { namespace: "instances", entityType: "instance" };
  } else if (namespace === "props" && field === "value") {
    const prop = state.props?.get(String(path[0]));
    if (prop?.type === "asset") {
      target = { namespace: "assets", entityType: "asset" };
    } else if (prop?.type === "resource") {
      target = { namespace: "resources", entityType: "resource" };
    } else if (prop?.type === "parameter") {
      target = { namespace: "dataSources", entityType: "dataSource" };
    } else if (prop?.type === "page") {
      target = { namespace: "pages", entityType: "page" };
    }
  } else if (namespace === "props" && parentField === "value") {
    const prop = state.props?.get(String(path[0]));
    if (prop?.type === "page" && field === "pageId") {
      target = { namespace: "pages", entityType: "page" };
    } else if (prop?.type === "page" && field === "instanceId") {
      target = { namespace: "instances", entityType: "instance" };
    }
  } else if (
    namespace === "instances" &&
    field === "value" &&
    path.at(-3) === "children" &&
    instanceChild?.type === "id"
  ) {
    target = { namespace: "instances", entityType: "instance" };
  } else if (namespace === "dataSources" && field === "scopeInstanceId") {
    target = {
      namespace: "instances",
      entityType: value === ROOT_INSTANCE_ID ? "root" : "instance",
    };
  } else if (namespace === "dataSources" && field === "resourceId") {
    target = { namespace: "resources", entityType: "resource" };
  } else if (namespace === "styles" && field === "styleSourceId") {
    target = { namespace: "styleSources", entityType: "styleSource" };
  } else if (namespace === "styles" && field === "breakpointId") {
    target = { namespace: "breakpoints", entityType: "breakpoint" };
  } else if (namespace === "styleSourceSelections" && field === "instanceId") {
    target = { namespace: "instances", entityType: "instance" };
  } else if (
    namespace === "styleSourceSelections" &&
    path.at(-2) === "values"
  ) {
    target = { namespace: "styleSources", entityType: "styleSource" };
  } else if (namespace === "assets" && field === "folderId") {
    target = { namespace: "assetFolders", entityType: "assetFolder" };
  } else if (namespace === "assetFolders" && field === "parentId") {
    target = { namespace: "assetFolders", entityType: "assetFolder" };
  } else if (namespace === "pages" && field === "rootInstanceId") {
    target = { namespace: "instances", entityType: "instance" };
  } else if (namespace === "pages" && field === "systemDataSourceId") {
    target = { namespace: "dataSources", entityType: "dataSource" };
  } else if (
    namespace === "pages" &&
    ["socialImageAssetId", "faviconAssetId", "thumbnailAssetId"].includes(
      String(field)
    )
  ) {
    target = { namespace: "assets", entityType: "asset" };
  } else if (namespace === "pages" && field === "homePageId") {
    target = { namespace: "pages", entityType: "page" };
  } else if (namespace === "pages" && field === "rootFolderId") {
    target = { namespace: "pages", entityType: "folder" };
  } else if (
    namespace === "pages" &&
    path[0] === "folders" &&
    path.at(-2) === "children"
  ) {
    target = state.pages?.pages.has(value)
      ? { namespace: "pages", entityType: "page" }
      : { namespace: "pages", entityType: "folder" };
  } else if (namespace === "projectSettings" && field === "faviconAssetId") {
    target = { namespace: "assets", entityType: "asset" };
  } else if (
    namespace === "marketplaceProduct" &&
    field === "thumbnailAssetId"
  ) {
    target = { namespace: "assets", entityType: "asset" };
  }
  if (target === undefined) {
    return;
  }
  return {
    namespace: target.namespace,
    entityType: target.entityType,
    id: value,
    resolved: hasReference(state, target.namespace, target.entityType, value),
  };
};

const addPageIds = (
  target: Map<string, Set<string>>,
  key: string | undefined,
  pageIds: Iterable<string>
) => {
  if (key === undefined) {
    return;
  }
  const ids = target.get(key) ?? new Set<string>();
  for (const pageId of pageIds) {
    ids.add(pageId);
  }
  target.set(key, ids);
};

const getPageContext = (state: BuilderState) => {
  if (state.pages === undefined) {
    return {
      pageIds: [] as string[],
      pagePaths: new Map<string, string>(),
      instancePageIds: new Map<string, Set<string>>(),
      recordPageIds: new Map<string, Set<string>>(),
      folderPageIds: new Map<string, Set<string>>(),
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
  const recordPageIds = new Map<string, Set<string>>();
  const fromInstance = (instanceId: string | undefined) =>
    instanceId === undefined ? [] : (instancePageIds.get(instanceId) ?? []);
  const fromScope = (instanceId: string | undefined) =>
    instanceId === undefined || instanceId === ROOT_INSTANCE_ID
      ? pageIds
      : fromInstance(instanceId);
  for (const prop of state.props?.values() ?? []) {
    addPageIds(
      recordPageIds,
      `props:${prop.id}`,
      fromInstance(prop.instanceId)
    );
    if (prop.type === "parameter") {
      addPageIds(
        recordPageIds,
        `dataSources:${prop.value}`,
        fromInstance(prop.instanceId)
      );
    }
  }
  for (const dataSource of state.dataSources?.values() ?? []) {
    addPageIds(
      recordPageIds,
      `dataSources:${dataSource.id}`,
      fromScope(dataSource.scopeInstanceId)
    );
    if (dataSource.type === "resource") {
      addPageIds(
        recordPageIds,
        `resources:${dataSource.resourceId}`,
        fromScope(dataSource.scopeInstanceId)
      );
    }
  }
  for (const page of serializedPages.pages) {
    addPageIds(recordPageIds, `dataSources:${page.systemDataSourceId}`, [
      page.id,
    ]);
  }
  for (const prop of state.props?.values() ?? []) {
    if (prop.type === "resource") {
      addPageIds(
        recordPageIds,
        `resources:${prop.value}`,
        fromInstance(prop.instanceId)
      );
    }
  }
  for (const [selectionId, selection] of state.styleSourceSelections ?? []) {
    const ids = fromInstance(selection.instanceId);
    addPageIds(recordPageIds, `styleSourceSelections:${selectionId}`, ids);
    for (const styleSourceId of selection.values) {
      addPageIds(recordPageIds, `styleSources:${styleSourceId}`, ids);
    }
  }
  for (const [styleId, style] of state.styles ?? []) {
    const ids = recordPageIds.get(`styleSources:${style.styleSourceId}`) ?? [];
    addPageIds(recordPageIds, `styles:${styleId}`, ids);
    addPageIds(recordPageIds, `breakpoints:${style.breakpointId}`, ids);
  }
  const usagesByAsset = calculateUsagesByAssetId({
    pages: state.pages,
    projectSettings: state.projectSettings,
    props: state.props ?? new Map(),
    styles: state.styles ?? new Map(),
    assets: state.assets ?? new Map(),
  });
  for (const [assetId, usages] of usagesByAsset) {
    for (const usage of usages) {
      if (usage.type === "favicon") {
        addPageIds(recordPageIds, `assets:${assetId}`, pageIds);
      } else if (
        usage.type === "socialImage" ||
        usage.type === "marketplaceThumbnail"
      ) {
        addPageIds(recordPageIds, `assets:${assetId}`, [usage.pageId]);
      } else if (usage.type === "prop") {
        const prop = state.props?.get(usage.propId);
        addPageIds(
          recordPageIds,
          `assets:${assetId}`,
          fromInstance(prop?.instanceId)
        );
      } else {
        addPageIds(
          recordPageIds,
          `assets:${assetId}`,
          recordPageIds.get(`styles:${usage.styleDeclKey}`) ?? []
        );
      }
    }
  }
  const assetFolderPageIds = new Map<string, Set<string>>();
  const directAssetFolderPageIds = new Map<string, Set<string>>();
  for (const asset of state.assets?.values() ?? []) {
    if (asset.folderId !== undefined) {
      addPageIds(
        directAssetFolderPageIds,
        asset.folderId,
        recordPageIds.get(`assets:${asset.id}`) ?? []
      );
    }
  }
  const childAssetFolderIds = new Map<string, string[]>();
  for (const folder of state.assetFolders?.values() ?? []) {
    if (folder.parentId !== undefined) {
      const childIds = childAssetFolderIds.get(folder.parentId) ?? [];
      childIds.push(folder.id);
      childAssetFolderIds.set(folder.parentId, childIds);
    }
  }
  const collectAssetFolderPages = (
    folderId: string,
    seen = new Set<string>()
  ): Set<string> => {
    if (seen.has(folderId)) {
      return new Set();
    }
    const cached = assetFolderPageIds.get(folderId);
    if (cached !== undefined) {
      return cached;
    }
    const ids = new Set(directAssetFolderPageIds.get(folderId) ?? []);
    const nextSeen = new Set(seen).add(folderId);
    for (const childId of childAssetFolderIds.get(folderId) ?? []) {
      for (const pageId of collectAssetFolderPages(childId, nextSeen)) {
        ids.add(pageId);
      }
    }
    assetFolderPageIds.set(folderId, ids);
    return ids;
  };
  for (const folderId of state.assetFolders?.keys() ?? []) {
    recordPageIds.set(
      `assetFolders:${folderId}`,
      collectAssetFolderPages(folderId)
    );
  }
  const folderPageIds = new Map<string, Set<string>>();
  const collectFolderPages = (
    folderId: string,
    seen = new Set<string>()
  ): Set<string> => {
    if (seen.has(folderId)) {
      return new Set();
    }
    const cached = folderPageIds.get(folderId);
    if (cached !== undefined) {
      return cached;
    }
    const ids = new Set<string>();
    const folder = state.pages?.folders.get(folderId);
    if (folder !== undefined) {
      const nextSeen = new Set(seen).add(folderId);
      for (const childId of folder.children) {
        if (state.pages?.pages.has(childId)) {
          ids.add(childId);
        } else {
          for (const pageId of collectFolderPages(childId, nextSeen)) {
            ids.add(pageId);
          }
        }
      }
    }
    folderPageIds.set(folderId, ids);
    return ids;
  };
  for (const folderId of state.pages?.folders.keys() ?? []) {
    collectFolderPages(folderId);
  }
  return { pageIds, pagePaths, instancePageIds, recordPageIds, folderPageIds };
};

const getAffectedPages = ({
  state,
  namespace,
  path,
  allPageIds,
  instancePageIds,
  recordPageIds,
  folderPageIds,
}: {
  state: BuilderState;
  namespace: BuilderNamespace;
  path: SearchPath;
  allPageIds: string[];
  instancePageIds: Map<string, Set<string>>;
  recordPageIds: Map<string, Set<string>>;
  folderPageIds: Map<string, Set<string>>;
}): { pageIds: string[]; pagePaths?: string[] } => {
  const fromInstance = (instanceId: string | undefined) =>
    instanceId === undefined
      ? []
      : Array.from(instancePageIds.get(instanceId) ?? []);
  if (namespace === "pages") {
    if (path[0] === "pages" && typeof path[1] === "string") {
      return { pageIds: [path[1]] };
    }
    if (path[0] === "folders" && typeof path[1] === "string") {
      if (path.at(-2) === "children" && typeof path.at(-1) === "number") {
        const childId = state.pages?.folders.get(path[1])?.children[
          path.at(-1) as number
        ];
        if (childId !== undefined) {
          return {
            pageIds: state.pages?.pages.has(childId)
              ? [childId]
              : [...(folderPageIds.get(childId) ?? [])],
          };
        }
      }
      return { pageIds: [...(folderPageIds.get(path[1]) ?? [])] };
    }
    if (path[0] === "pageTemplates") {
      return { pageIds: [] };
    }
    if (path[0] === "redirects" && typeof path[1] === "number") {
      const redirect = state.pages?.redirects?.[path[1]];
      return {
        pageIds: [],
        pagePaths: redirect === undefined ? [] : [redirect.old, redirect.new],
      };
    }
    return { pageIds: allPageIds };
  }
  if (namespace === "projectSettings") {
    return { pageIds: allPageIds };
  }
  if (namespace === "marketplaceProduct") {
    return { pageIds: [] };
  }
  const recordId = typeof path[0] === "string" ? path[0] : undefined;
  if (namespace === "instances") {
    return { pageIds: fromInstance(recordId) };
  }
  return {
    pageIds: [...(recordPageIds.get(`${namespace}:${recordId}`) ?? [])],
  };
};

export const searchProject = (
  state: BuilderState,
  input: z.infer<typeof projectSearchInput>
) => {
  const namespaces = getSelectedNamespaces(input);
  if (input.scopes !== undefined) {
    const analysis = analyzeProject(state, {
      query: input.query,
      scopes: input.scopes,
      pageId: input.pageId,
      pagePath: input.pagePath,
      limit: Number.MAX_SAFE_INTEGER,
    });
    let excludedSensitiveValueCount = 0;
    const compatibleMatches: Array<
      Record<string, unknown> & { kind: LegacySearchKind }
    > = [];
    for (const match of analysis.matches) {
      if (match.kind === "prop" && typeof match.propId === "string") {
        const prop = state.props?.get(match.propId);
        if (isSensitiveName(prop?.name)) {
          excludedSensitiveValueCount += countSearchValues(prop?.value);
          continue;
        }
      }
      compatibleMatches.push(
        match as Record<string, unknown> & { kind: LegacySearchKind }
      );
    }
    const { items, ...pagination } = paginateOutput({
      items: compatibleMatches,
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
      scopes: input.scopes,
      matches: items,
      excludedSensitiveValueCount,
      truncated: pagination.nextCursor !== null,
      ...pagination,
    };
  }
  const query = input.query.toLocaleLowerCase();
  const offset = input.cursor === undefined ? 0 : Number(input.cursor);
  if (Number.isInteger(offset) === false || offset < 0) {
    throw new Error("Invalid pagination cursor");
  }
  const limit = input.limit ?? 20;
  const pageContext = getPageContext(state);
  const selectedPage =
    input.pageId === undefined && input.pagePath === undefined
      ? undefined
      : findSerializedPageByInput(getSerializedPages(state), input);
  if (
    (input.pageId !== undefined || input.pagePath !== undefined) &&
    selectedPage === undefined
  ) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  const matches: Array<{
    matchId: string;
    kind: "value";
    matchType: SearchMatchType;
    currentValue: SearchValue;
    entity: { type: string; id: string };
    location: { namespace: BuilderNamespace; path: SearchPath };
    pageIds: string[];
    pagePaths: string[];
    reference?: {
      namespace: BuilderNamespace;
      entityType: string;
      id: string;
      resolved: boolean;
    };
  }> = [];
  let total = 0;
  let excludedSensitiveValueCount = 0;
  for (const namespace of namespaces) {
    visitSearchValues(
      state[namespace],
      [],
      [],
      ({ currentValue, matchType, path, stablePath }) => {
        if (
          String(currentValue).toLocaleLowerCase().includes(query) === false
        ) {
          return;
        }
        const affected = getAffectedPages({
          state,
          namespace,
          path,
          allPageIds: pageContext.pageIds,
          instancePageIds: pageContext.instancePageIds,
          recordPageIds: pageContext.recordPageIds,
          folderPageIds: pageContext.folderPageIds,
        });
        if (
          selectedPage !== undefined &&
          affected.pageIds.includes(selectedPage.id) === false &&
          (affected.pagePaths?.includes(
            pageContext.pagePaths.get(selectedPage.id) ?? ""
          ) ?? false) === false
        ) {
          return;
        }
        const matchIndex = total;
        total += 1;
        if (matchIndex < offset || matches.length >= limit) {
          return;
        }
        matches.push({
          matchId: `project-match:v2:${JSON.stringify([namespace, matchType, ...stablePath])}`,
          kind: "value",
          matchType,
          currentValue,
          entity: getEntity(namespace, path),
          location: { namespace, path },
          pageIds: affected.pageIds,
          pagePaths:
            affected.pagePaths ??
            affected.pageIds.flatMap((id) => {
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
      },
      (count) => {
        excludedSensitiveValueCount += count;
      },
      {
        searchObjectKeys: false,
      }
    );
  }
  const filters = Object.fromEntries(
    Object.entries({
      query: input.query,
      namespaces,
      scopes: input.scopes,
      pageId: input.pageId,
      pagePath: input.pagePath,
    }).filter(([, value]) => value !== undefined)
  );
  const nextOffset = offset + matches.length;
  const nextCursor = nextOffset < total ? String(nextOffset) : null;
  return {
    query: input.query,
    namespaces,
    scopes: input.scopes ?? [],
    matches,
    excludedSensitiveValueCount,
    truncated: nextCursor !== null,
    detail:
      input.verbose === true ? ("verbose" as const) : ("compact" as const),
    total,
    returnedCount: matches.length,
    nextCursor,
    filters,
  };
};
