import { z } from "zod";
import { isLiteralExpression } from "@webstudio-is/expression";
import {
  assets as assetsSchema,
  assetFolders as assetFoldersSchema,
  breakpoints as breakpointsSchema,
  dataSources as dataSourcesSchema,
  instances as instancesSchema,
  isAssetsResource,
  pages as pagesSchema,
  props as propsSchema,
  resources as resourcesSchema,
  styles as stylesSchema,
  styleSources as styleSourcesSchema,
  styleSourceSelections as styleSourceSelectionsSchema,
  type StyleDecl,
} from "@webstudio-is/sdk";
import { hasTopLevelJsonLdContext } from "@webstudio-is/sdk/runtime";
import { validateJsonLdWithSchemaOrg } from "@webstudio-is/sdk/schema-org";
import { ariaAttributes, ariaRoles } from "@webstudio-is/html-data";
import { validateSelector } from "@webstudio-is/css-data";
import * as bcp47 from "bcp-47";
import type { BuilderState } from "../state/builder-state";
import { throwBuilderRuntimeError } from "./errors";
import { computeExpression } from "./data";
import { listAssets } from "./assets";
import { listCssVariables, listDesignTokens } from "./styles";
import { getInstanceDepths } from "./instances";
import { isBaseWidthBreakpoint } from "./breakpoints";
import { findSerializedPageByInput, getSerializedPages } from "./pages";
import { validatePageSelector } from "./page-selector";
import { hasAccessibleName, isDynamicPropType } from "./accessibility-analysis";
import { paginateOutput, paginatedOutputInputSchema } from "./output";
import { applyBuilderPatchTransactions } from "../state/patch";
import type { BuilderNamespace } from "../contracts/namespaces";
import { createRuntimeMutation } from "./mutation";
import { projectSettings as projectSettingsSchema } from "../shared/project-settings";
import { marketplaceProduct as marketplaceProductSchema } from "../shared/marketplace";
import { verifyBindings } from "./binding-verification";

const projectLookupScope = z.enum([
  "all",
  "pages",
  "instances",
  "text",
  "props",
  "bindings",
  "variables",
  "resources",
  "assets",
  "documents",
  "styles",
  "tokens",
  "redirects",
  "settings",
]);

const projectAnalysisScope = z.enum([
  ...projectLookupScope.options,
  "accessibility",
  "security",
  "seo",
  "performance",
]);

export const projectSearchInput = z
  .object({
    query: z.string().min(1),
    scopes: z.array(projectLookupScope).min(1).optional(),
    pageId: z.string().optional(),
    pagePath: z.string().optional(),
    maxDurationMs: z.number().int().positive().optional(),
    confirmSlow: z.boolean().optional(),
    confirmationToken: z.string().optional(),
    ...paginatedOutputInputSchema.shape,
  })
  .strict()
  .superRefine(validatePageSelector);

type ProjectAnalysisInput = {
  query?: string;
  scopes?: Array<z.infer<typeof projectAnalysisScope>>;
  pageId?: string;
  pagePath?: string;
  limit?: number;
};

const defaultScopes = [
  "instances",
  "text",
  "props",
  "resources",
  "assets",
  "styles",
] as const;
const defaultProjectSearchScopes = ["all"] as const;

type SearchPath = Array<string | number>;

export type ProjectSearchMatch = {
  matchId: string;
  kind: string;
  entityType: string;
  entityId: string;
  currentValue: string | number | boolean | null;
  editable: boolean;
  location: {
    namespace: BuilderNamespace;
    path: SearchPath;
    field?: string;
  };
  affectedRoutes: string[];
  reference?: {
    targetType: string;
    targetId: string;
    resolved: boolean;
    valid: boolean;
  };
};

const namespaceSchemas = {
  pages: pagesSchema,
  instances: instancesSchema,
  props: propsSchema,
  styles: stylesSchema,
  styleSources: styleSourcesSchema,
  styleSourceSelections: styleSourceSelectionsSchema,
  dataSources: dataSourcesSchema,
  resources: resourcesSchema,
  assets: assetsSchema,
  assetFolders: assetFoldersSchema,
  breakpoints: breakpointsSchema,
  projectSettings: projectSettingsSchema,
  marketplaceProduct: marketplaceProductSchema,
} satisfies Record<BuilderNamespace, z.ZodType>;

const encodeMatchId = (namespace: BuilderNamespace, path: SearchPath) =>
  `project-match:${encodeURIComponent(JSON.stringify([namespace, ...path]))}`;

const decodeMatchId = (matchId: string) => {
  const prefix = "project-match:";
  if (matchId.startsWith(prefix) === false) {
    return throwBuilderRuntimeError("BAD_REQUEST", "Invalid project match id");
  }
  try {
    const decoded: unknown = JSON.parse(
      decodeURIComponent(matchId.slice(prefix.length))
    );
    if (
      Array.isArray(decoded) === false ||
      decoded.length < 2 ||
      typeof decoded[0] !== "string"
    ) {
      throw new Error("invalid match path");
    }
    const [namespace, ...path] = decoded;
    if (Object.hasOwn(namespaceSchemas, namespace) === false) {
      throw new Error("invalid namespace");
    }
    if (
      path.some(
        (segment) => typeof segment !== "string" && typeof segment !== "number"
      )
    ) {
      throw new Error("invalid path");
    }
    return {
      namespace: namespace as BuilderNamespace,
      path: path as SearchPath,
    };
  } catch {
    return throwBuilderRuntimeError("BAD_REQUEST", "Invalid project match id");
  }
};

const visitPrimitiveValues = (
  value: unknown,
  visit: (value: string | number | boolean | null, path: SearchPath) => void,
  path: SearchPath = []
) => {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    visit(value, path);
    return;
  }
  if (value instanceof Map) {
    for (const [key, item] of value) {
      visitPrimitiveValues(item, visit, [...path, key]);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      visitPrimitiveValues(item, visit, [...path, index]);
    }
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      visitPrimitiveValues(item, visit, [...path, key]);
    }
  }
};

const getPathValue = (value: unknown, path: SearchPath): unknown => {
  let current = value;
  for (const segment of path) {
    if (current instanceof Map) {
      current = current.get(segment);
    } else if (Array.isArray(current)) {
      current = current[Number(segment)];
    } else if (typeof current === "object" && current !== null) {
      current = (current as Record<string, unknown>)[String(segment)];
    } else {
      return;
    }
  }
  return current;
};

const normalizePagePath = (path: string) => (path === "" ? "/" : path);

const getSearchContext = (state: BuilderState) => {
  const routesByInstanceId = new Map<string, Set<string>>();
  const pagesById = new Map<string, string>();
  if (state.pages !== undefined && state.instances !== undefined) {
    for (const page of getSerializedPages(state).pages) {
      const route = normalizePagePath(page.path);
      pagesById.set(page.id, route);
      for (const instanceId of getInstanceDepths(state.instances, [
        page.rootInstanceId,
      ]).keys()) {
        const routes = routesByInstanceId.get(instanceId) ?? new Set<string>();
        routes.add(route);
        routesByInstanceId.set(instanceId, routes);
      }
    }
  }
  return { pagesById, routesByInstanceId };
};

const getEntity = ({
  state,
  namespace,
  path,
}: {
  state: BuilderState;
  namespace: BuilderNamespace;
  path: SearchPath;
}) => {
  const recordId = String(path[0] ?? namespace);
  if (namespace === "pages") {
    if (path[0] === "pages") {
      return { entityType: "page", entityId: String(path[1]), kind: "page" };
    }
    if (path[0] === "redirects") {
      return {
        entityType: "redirect",
        entityId: String(path[1]),
        kind: "redirect",
      };
    }
    if (path[0] === "folders") {
      return {
        entityType: "page-folder",
        entityId: String(path[1]),
        kind: "page-folder",
      };
    }
  }
  if (namespace === "instances") {
    const instance = state.instances?.get(recordId);
    const childIndex = path[1] === "children" ? Number(path[2]) : undefined;
    const child =
      childIndex === undefined ? undefined : instance?.children[childIndex];
    if (child?.type === "text" || child?.type === "expression") {
      return { entityType: "text", entityId: recordId, kind: "text" };
    }
    return { entityType: "instance", entityId: recordId, kind: "instance" };
  }
  if (namespace === "props") {
    const type = state.props?.get(recordId)?.type;
    return {
      entityType:
        type === "expression" ||
        type === "resource" ||
        type === "parameter" ||
        type === "page"
          ? "binding"
          : "prop",
      entityId: recordId,
      kind: "prop",
    };
  }
  const types: Partial<Record<BuilderNamespace, string>> = {
    resources: "resource",
    dataSources: "variable",
    assets: "asset",
    assetFolders: "asset-folder",
    styles: "style",
    styleSources:
      state.styleSources?.get(recordId)?.type === "token"
        ? "design-token"
        : "style-source",
    styleSourceSelections: "style-source-selection",
    breakpoints: "breakpoint",
    projectSettings: "project-setting",
    marketplaceProduct: "marketplace-setting",
  };
  const entityType = types[namespace] ?? namespace;
  return { entityType, entityId: recordId, kind: entityType };
};

const getScope = (match: Pick<ProjectSearchMatch, "entityType">) => {
  const scopes: Record<string, z.infer<typeof projectLookupScope>> = {
    page: "pages",
    "page-folder": "pages",
    redirect: "redirects",
    instance: "instances",
    text: "text",
    prop: "props",
    binding: "bindings",
    variable: "variables",
    resource: "resources",
    asset: "assets",
    "asset-folder": "assets",
    style: "styles",
    "style-source": "styles",
    "style-source-selection": "styles",
    "design-token": "tokens",
    breakpoint: "styles",
    "project-setting": "settings",
    "marketplace-setting": "settings",
  };
  return scopes[match.entityType];
};

const getLegacySearchIdentity = ({
  state,
  namespace,
  path,
}: {
  state: BuilderState;
  namespace: BuilderNamespace;
  path: SearchPath;
}) => {
  const recordId = String(path[0]);
  if (namespace === "instances") {
    return {
      instanceId: recordId,
      ...(path[1] === "children" ? { childIndex: Number(path[2]) } : {}),
    };
  }
  if (namespace === "props") {
    const prop = state.props?.get(recordId);
    return {
      propId: recordId,
      instanceId: prop?.instanceId,
      name: prop?.name,
      type: prop?.type,
    };
  }
  if (namespace === "resources") {
    return { resourceId: recordId };
  }
  if (namespace === "assets") {
    return { assetId: recordId };
  }
  if (namespace === "styles") {
    const style = state.styles?.get(recordId);
    return {
      styleSourceId: style?.styleSourceId,
      breakpointId: style?.breakpointId,
      styleProperty: style?.property,
    };
  }
  if (namespace === "styleSources") {
    const token = listDesignTokens(state, { withUsage: true }).tokens.find(
      ({ id }) => id === recordId
    );
    if (token !== undefined) {
      return {
        designTokenId: recordId,
        name: token.name,
        declarationCount: token.declarationCount,
        usageCount: token.usageCount,
      };
    }
    return { styleSourceId: recordId };
  }
  return {};
};

const getAffectedRoutes = ({
  state,
  namespace,
  path,
  pagesById,
  routesByInstanceId,
}: {
  state: BuilderState;
  namespace: BuilderNamespace;
  path: SearchPath;
  pagesById: ReadonlyMap<string, string>;
  routesByInstanceId: ReadonlyMap<string, ReadonlySet<string>>;
}) => {
  const routes = new Set<string>();
  const addInstanceRoutes = (instanceId: string | undefined) => {
    if (instanceId === undefined) {
      return;
    }
    for (const route of routesByInstanceId.get(instanceId) ?? []) {
      routes.add(route);
    }
  };
  if (namespace === "pages" && path[0] === "pages") {
    const route = pagesById.get(String(path[1]));
    if (route !== undefined) {
      routes.add(route);
    }
  }
  if (namespace === "instances") {
    addInstanceRoutes(String(path[0]));
  } else if (namespace === "props") {
    addInstanceRoutes(state.props?.get(String(path[0]))?.instanceId);
  } else if (namespace === "dataSources") {
    addInstanceRoutes(state.dataSources?.get(String(path[0]))?.scopeInstanceId);
  } else if (namespace === "resources") {
    for (const dataSource of state.dataSources?.values() ?? []) {
      if (
        dataSource.type === "resource" &&
        dataSource.resourceId === String(path[0])
      ) {
        addInstanceRoutes(dataSource.scopeInstanceId);
      }
    }
  } else if (namespace === "styleSourceSelections") {
    addInstanceRoutes(String(path[0]));
  } else if (namespace === "styles" || namespace === "styleSources") {
    const styleSourceId =
      namespace === "styles"
        ? state.styles?.get(String(path[0]))?.styleSourceId
        : String(path[0]);
    for (const selection of state.styleSourceSelections?.values() ?? []) {
      if (
        styleSourceId !== undefined &&
        selection.values.includes(styleSourceId)
      ) {
        addInstanceRoutes(selection.instanceId);
      }
    }
  } else if (namespace === "breakpoints") {
    for (const style of state.styles?.values() ?? []) {
      if (style.breakpointId !== String(path[0])) {
        continue;
      }
      for (const selection of state.styleSourceSelections?.values() ?? []) {
        if (selection.values.includes(style.styleSourceId)) {
          addInstanceRoutes(selection.instanceId);
        }
      }
    }
  } else if (namespace === "assets") {
    const assetId = String(path[0]);
    for (const prop of state.props?.values() ?? []) {
      if (prop.type === "asset" && prop.value === assetId) {
        addInstanceRoutes(prop.instanceId);
      }
    }
    for (const [pageId, route] of pagesById) {
      if (state.pages?.pages.get(pageId)?.meta.socialImageAssetId === assetId) {
        routes.add(route);
      }
    }
  }
  if (namespace === "pages" && path[0] === "redirects") {
    routes.add("*");
  }
  if (namespace === "projectSettings" || namespace === "marketplaceProduct") {
    routes.add("*");
  }
  return [...routes].sort();
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
  value: string | number | boolean | null;
}): ProjectSearchMatch["reference"] => {
  if (typeof value !== "string") {
    return;
  }
  let targetType: string | undefined;
  let resolved = false;
  if (namespace === "props" && path.at(-1) === "value") {
    const type = state.props?.get(String(path[0]))?.type;
    if (type === "asset") {
      targetType = "asset";
      resolved = state.assets?.has(value) === true;
    } else if (type === "resource") {
      targetType = "resource";
      resolved = state.resources?.has(value) === true;
    } else if (type === "parameter") {
      targetType = "variable";
      resolved = state.dataSources?.has(value) === true;
    } else if (type === "page") {
      targetType = "page";
      resolved = state.pages?.pages.has(value) === true;
    }
  }
  if (namespace === "styles" && path.at(-1) === "styleSourceId") {
    targetType = "style-source";
    resolved = state.styleSources?.has(value) === true;
  }
  if (namespace === "styles" && path.at(-1) === "breakpointId") {
    targetType = "breakpoint";
    resolved = state.breakpoints?.has(value) === true;
  }
  if (
    namespace === "instances" &&
    path[1] === "children" &&
    path.at(-1) === "value" &&
    state.instances?.get(String(path[0]))?.children[Number(path[2])]?.type ===
      "id"
  ) {
    targetType = "instance";
    resolved = state.instances?.has(value) === true;
  }
  if (namespace === "dataSources" && path.at(-1) === "resourceId") {
    targetType = "resource";
    resolved = state.resources?.has(value) === true;
  }
  if (namespace === "pages" && path.at(-1) === "socialImageAssetId") {
    targetType = "asset";
    resolved = state.assets?.has(value) === true;
  }
  if (namespace === "styleSourceSelections" && path[1] === "values") {
    targetType = "style-source";
    resolved = state.styleSources?.has(value) === true;
  }
  if (targetType === undefined) {
    return;
  }
  return { targetType, targetId: value, resolved, valid: resolved };
};

const getBrokenReferenceIds = (state: BuilderState) => {
  const brokenReferences = new Set<string>();
  for (const namespace of Object.keys(namespaceSchemas) as BuilderNamespace[]) {
    const namespaceValue = state[namespace];
    if (namespaceValue === undefined) {
      continue;
    }
    visitPrimitiveValues(namespaceValue, (value, path) => {
      const reference = getReference({ state, namespace, path, value });
      if (reference?.valid === false) {
        brokenReferences.add(
          `${encodeMatchId(namespace, path)}:${reference.targetType}:${reference.targetId}`
        );
      }
    });
  }
  return brokenReferences;
};

const collectProjectSearchMatches = (
  state: BuilderState,
  input: z.infer<typeof projectSearchInput>
) => {
  const query = input.query.toLocaleLowerCase();
  const selectedScopes = new Set(input.scopes ?? defaultProjectSearchScopes);
  const allScopes = selectedScopes.has("all");
  const { pagesById, routesByInstanceId } = getSearchContext(state);
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
  const selectedRoute =
    selectedPage === undefined
      ? undefined
      : normalizePagePath(selectedPage.path);
  const matches: ProjectSearchMatch[] = [];
  for (const namespace of Object.keys(namespaceSchemas) as BuilderNamespace[]) {
    const namespaceValue = state[namespace];
    if (namespaceValue === undefined) {
      continue;
    }
    visitPrimitiveValues(namespaceValue, (value, path) => {
      if (serializeValue(value).toLocaleLowerCase().includes(query) === false) {
        return;
      }
      if (path.at(-1) === "id" && namespace !== "styleSources") {
        return;
      }
      const entity = getEntity({ state, namespace, path });
      const scope = getScope(entity);
      if (
        allScopes === false &&
        (scope === undefined || selectedScopes.has(scope) === false)
      ) {
        return;
      }
      const field =
        typeof path.at(-1) === "string" ? String(path.at(-1)) : undefined;
      const editable =
        field !== "id" &&
        !(namespace === "pages" && path.length === 1) &&
        field !== "homePageId" &&
        field !== "rootFolderId";
      matches.push({
        ...entity,
        ...getLegacySearchIdentity({ state, namespace, path }),
        matchId: encodeMatchId(namespace, path),
        currentValue: value,
        editable,
        location: { namespace, path, field },
        affectedRoutes: getAffectedRoutes({
          state,
          namespace,
          path,
          pagesById,
          routesByInstanceId,
        }),
        reference: getReference({ state, namespace, path, value }),
      });
    });
    if (namespace === "styleSources") {
      for (const [styleSourceId, styleSource] of state.styleSources ?? []) {
        if (
          styleSource.type !== "token" ||
          styleSourceId.toLocaleLowerCase().includes(query) === false ||
          matches.some(
            (match) =>
              match.entityType === "design-token" &&
              match.entityId === styleSourceId
          )
        ) {
          continue;
        }
        const path = [styleSourceId, "name"];
        const entity = getEntity({ state, namespace, path });
        matches.push({
          ...entity,
          ...getLegacySearchIdentity({ state, namespace, path }),
          matchId: encodeMatchId(namespace, path),
          currentValue: styleSource.name,
          editable: true,
          location: { namespace, path, field: "name" },
          affectedRoutes: [],
        });
      }
    }
  }
  if (selectedRoute === undefined) {
    return matches;
  }
  const projectWideNamespaces = new Set<BuilderNamespace>([
    "assets",
    "assetFolders",
    "styles",
    "styleSources",
    "styleSourceSelections",
    "breakpoints",
    "projectSettings",
    "marketplaceProduct",
  ]);
  return matches.filter(
    (match) =>
      match.affectedRoutes.includes(selectedRoute) ||
      projectWideNamespaces.has(match.location.namespace)
  );
};

export const projectMatchUpdatesInput = z
  .object({
    updates: z
      .array(
        z
          .object({
            matchId: z.string(),
            expectedValue: z.union([
              z.string(),
              z.number(),
              z.boolean(),
              z.null(),
            ]),
            value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
          })
          .strict()
      )
      .min(1),
  })
  .strict();

const getAllBindingFindings = (state: BuilderState) => {
  const findings: ReturnType<typeof verifyBindings>["findings"] = [];
  let cursor: string | undefined;
  do {
    const result = verifyBindings(state, { cursor, limit: 200 });
    findings.push(...result.findings);
    cursor = result.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return findings;
};

export const updateProjectMatches = (
  state: BuilderState,
  input: z.infer<typeof projectMatchUpdatesInput>
) => {
  const changes = new Map<
    BuilderNamespace,
    Array<{ op: "replace"; path: SearchPath; value: unknown }>
  >();
  const affectedEntities: Array<{ entityType: string; entityId: string }> = [];
  const affectedRoutes = new Set<string>();
  const { pagesById, routesByInstanceId } = getSearchContext(state);
  const matchIds = new Set<string>();
  for (const update of input.updates) {
    if (matchIds.has(update.matchId)) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `Project match ${update.matchId} is updated more than once`
      );
    }
    matchIds.add(update.matchId);
    const { namespace, path } = decodeMatchId(update.matchId);
    const namespaceValue = state[namespace];
    const currentValue = getPathValue(namespaceValue, path);
    if (Object.is(currentValue, update.expectedValue) === false) {
      return throwBuilderRuntimeError(
        "CONFLICT",
        `Project value for ${update.matchId} changed since search`
      );
    }
    const field = path.at(-1);
    if (
      field === "id" ||
      field === "homePageId" ||
      field === "rootFolderId" ||
      (namespace === "pages" && path.length === 1)
    ) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `Project match ${update.matchId} is not editable`
      );
    }
    const entity = getEntity({ state, namespace, path });
    affectedEntities.push({
      entityType: entity.entityType,
      entityId: entity.entityId,
    });
    for (const route of getAffectedRoutes({
      state,
      namespace,
      path,
      pagesById,
      routesByInstanceId,
    })) {
      affectedRoutes.add(route);
    }
    const patches = changes.get(namespace) ?? [];
    patches.push({ op: "replace", path, value: update.value });
    changes.set(namespace, patches);
  }
  const payload = [...changes].map(([namespace, patches]) => ({
    namespace,
    patches,
  }));
  const nextState = applyBuilderPatchTransactions(state, [
    { id: "project-update-matches-validation", payload },
  ]).state;
  for (const namespace of changes.keys()) {
    const result = namespaceSchemas[namespace].safeParse(nextState[namespace]);
    if (result.success === false) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `Updated ${namespace} values are invalid: ${z.prettifyError(result.error)}`
      );
    }
  }
  const brokenReferences = getBrokenReferenceIds(state);
  const newBrokenReferences = [...getBrokenReferenceIds(nextState)].filter(
    (reference) => brokenReferences.has(reference) === false
  );
  if (newBrokenReferences.length > 0) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      `Updated values introduce unresolved references: ${newBrokenReferences.join(
        ", "
      )}`
    );
  }
  if (nextState.pages !== undefined) {
    const routes = getSerializedPages(nextState).pages.map(({ path }) => path);
    if (new Set(routes).size !== routes.length) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Updated page paths must remain unique"
      );
    }
  }
  const bindingNamespaces = [
    state.pages,
    state.instances,
    state.props,
    state.dataSources,
    state.resources,
    nextState.pages,
    nextState.instances,
    nextState.props,
    nextState.dataSources,
    nextState.resources,
  ];
  if (bindingNamespaces.every((namespace) => namespace !== undefined)) {
    const beforeFindingIds = new Set(
      getAllBindingFindings(state).map(({ id }) => id)
    );
    const newFindings = getAllBindingFindings(nextState).filter(
      ({ id }) => beforeFindingIds.has(id) === false
    );
    if (newFindings.length > 0) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `Updated values introduce invalid bindings or references: ${newFindings
          .map(({ message }) => message)
          .join("; ")}`
      );
    }
  }
  const uniqueAffectedEntities = [
    ...new Map(
      affectedEntities.map((entity) => [
        `${entity.entityType}:${entity.entityId}`,
        entity,
      ])
    ).values(),
  ];
  return createRuntimeMutation({
    payload,
    invalidatesNamespaces: [...changes.keys()],
    result: {
      changedCount: input.updates.length,
      affectedEntities: uniqueAffectedEntities,
      affectedRoutes: [...affectedRoutes].sort(),
      generatedValues: [],
      validation: { status: "passed" as const },
      uncertainty: [],
      next: "Run focused assertions for the affected routes.",
      slowOperationConsentRequired: false,
    },
  });
};

const serializeValue = (value: unknown) => {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};

const matchesQuery = (query: string | undefined, ...values: unknown[]) =>
  query === undefined ||
  values.some((value) =>
    serializeValue(value)
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase())
  );

const isStaticAriaNumber = (value: string | number) => {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  return (
    /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()) &&
    Number.isFinite(Number(value))
  );
};

const hasNonEmptyProp = (
  props: ReadonlyMap<string, unknown> | undefined,
  name: string
) => {
  const value = props?.get(name);
  return (
    value !== undefined && (typeof value !== "string" || value.trim() !== "")
  );
};

const hasDynamicProp = (
  propTypes: ReadonlyMap<string, string> | undefined,
  ...names: string[]
) => names.some((name) => isDynamicPropType(propTypes?.get(name)));

const ariaLiteralValues = new Map<string, ReadonlySet<string | boolean>>();
const ariaNumberAttributes = new Set<string>();
for (const attribute of ariaAttributes) {
  if (attribute.type === "boolean") {
    ariaLiteralValues.set(
      attribute.name,
      new Set([true, false, "true", "false"])
    );
  }
  if (attribute.type === "select") {
    ariaLiteralValues.set(attribute.name, new Set(attribute.options));
  }
  if (attribute.type === "number") {
    ariaNumberAttributes.add(attribute.name);
  }
}

const ariaIdReferenceAttributes = [
  "aria-activedescendant",
  "aria-controls",
  "aria-describedby",
  "aria-details",
  "aria-errormessage",
  "aria-flowto",
  "aria-labelledby",
  "aria-owns",
] as const;

const getPageInstanceIds = (
  state: Pick<BuilderState, "pages" | "instances">,
  input: Pick<ProjectAnalysisInput, "pageId" | "pagePath">
) => {
  if (input.pageId === undefined && input.pagePath === undefined) {
    return;
  }
  const page = findSerializedPageByInput(getSerializedPages(state), input);
  if (page === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  if (state.instances === undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", "Instances are required");
  }
  return new Set(
    getInstanceDepths(state.instances, [page.rootInstanceId]).keys()
  );
};

const isInteractiveInstance = ({
  component,
  tag,
  props,
}: {
  component: string;
  tag?: string;
  props: ReadonlyMap<string, unknown> | undefined;
}) =>
  component === "Button" ||
  component === "Link" ||
  tag === "button" ||
  tag === "a" ||
  props?.get("role") === "button" ||
  props?.get("role") === "link";

const isLabelInstance = ({
  component,
  tag,
}: {
  component: string;
  tag?: string;
}) => component === "Label" || tag === "label";

const isLabelableFormControl = ({
  component,
  tag,
  props,
}: {
  component: string;
  tag?: string;
  props: ReadonlyMap<string, unknown> | undefined;
}) => {
  if (
    component !== "Input" &&
    component !== "Select" &&
    component !== "Textarea" &&
    tag !== "input" &&
    tag !== "select" &&
    tag !== "textarea"
  ) {
    return false;
  }
  if (component !== "Input" && tag !== "input") {
    return true;
  }
  const type = props?.get("type");
  if (typeof type !== "string") {
    return true;
  }
  return (
    ["hidden", "button", "submit", "reset", "image"].includes(
      type.toLocaleLowerCase()
    ) === false
  );
};

const createParentIdsByInstance = (
  instances: NonNullable<BuilderState["instances"]>
) => {
  const parentIdsByInstance = new Map<string, string[]>();
  for (const instance of instances.values()) {
    for (const child of instance.children) {
      if (child.type !== "id") {
        continue;
      }
      const parentIds = parentIdsByInstance.get(child.value) ?? [];
      parentIds.push(instance.id);
      parentIdsByInstance.set(child.value, parentIds);
    }
  }
  return parentIdsByInstance;
};

const getLabelTargetId = (props: ReadonlyMap<string, unknown> | undefined) =>
  props?.get("for") ?? props?.get("htmlFor");

const hasAssociatedFormLabel = ({
  instanceId,
  instances,
  propsByInstance,
  parentIdsByInstance,
  relatedInstanceIds,
}: {
  instanceId: string;
  instances: NonNullable<BuilderState["instances"]>;
  propsByInstance: ReadonlyMap<string, ReadonlyMap<string, unknown>>;
  parentIdsByInstance: ReadonlyMap<string, readonly string[]>;
  relatedInstanceIds: ReadonlySet<string> | undefined;
}) => {
  const id = propsByInstance.get(instanceId)?.get("id");
  for (const label of instances.values()) {
    if (
      isLabelInstance(label) === false ||
      (relatedInstanceIds !== undefined &&
        relatedInstanceIds.has(label.id) === false)
    ) {
      continue;
    }
    if (
      id !== undefined &&
      getLabelTargetId(propsByInstance.get(label.id)) === id &&
      hasAccessibleName({
        instanceId: label.id,
        instances,
        propsByInstance,
      })
    ) {
      return true;
    }
  }
  const visited = new Set<string>();
  const hasLabelAncestor = (currentId: string): boolean => {
    if (visited.has(currentId)) {
      return false;
    }
    visited.add(currentId);
    return (parentIdsByInstance.get(currentId) ?? []).some((parentId) => {
      const parent = instances.get(parentId);
      if (parent === undefined) {
        return false;
      }
      if (isLabelInstance(parent)) {
        return hasAccessibleName({
          instanceId: parentId,
          instances,
          propsByInstance,
        });
      }
      return hasLabelAncestor(parentId);
    });
  };
  return hasLabelAncestor(instanceId);
};

const getHeadingLevel = (tag: string | undefined) => {
  if (tag === undefined || /^h[1-6]$/.test(tag) === false) {
    return;
  }
  return Number(tag.slice(1));
};

const getPagesToAudit = (
  state: Pick<BuilderState, "pages">,
  input: Pick<ProjectAnalysisInput, "pageId" | "pagePath">
) => {
  const pages = getSerializedPages(state);
  const selectedPages =
    input.pageId === undefined && input.pagePath === undefined
      ? pages.pages
      : [findSerializedPageByInput(pages, input)].filter(
          (page): page is (typeof pages.pages)[number] => page !== undefined
        );
  return selectedPages.filter(
    (page) =>
      page.meta.documentType !== "xml" && page.meta.documentType !== "text"
  );
};

const getRelatedPageInstanceIds = (
  instanceId: string,
  pageInstanceIds: readonly ReadonlySet<string>[]
) => {
  const related = new Set<string>();
  for (const ids of pageInstanceIds) {
    if (ids.has(instanceId)) {
      for (const id of ids) {
        related.add(id);
      }
    }
  }
  return related.size === 0 ? undefined : related;
};

const getStaticString = (expression: string) => {
  if (isLiteralExpression(expression) === false) {
    return;
  }
  const value = computeExpression(expression, new Map());
  return typeof value === "string" ? value : undefined;
};

export const analyzeProject = (
  state: Pick<
    BuilderState,
    | "pages"
    | "projectSettings"
    | "instances"
    | "props"
    | "styles"
    | "styleSources"
    | "styleSourceSelections"
    | "resources"
    | "dataSources"
    | "assets"
    | "breakpoints"
  >,
  input: ProjectAnalysisInput
) => {
  if (
    state.instances === undefined ||
    state.props === undefined ||
    state.styles === undefined ||
    state.styleSources === undefined ||
    state.styleSourceSelections === undefined ||
    state.resources === undefined ||
    state.dataSources === undefined ||
    state.assets === undefined ||
    state.breakpoints === undefined
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Project search requires instances, props, styles, style sources, resources, data sources, assets, and breakpoints"
    );
  }
  const instances = state.instances;
  const scopes = new Set(input.scopes ?? defaultScopes);
  const instanceIds = getPageInstanceIds(state, input);
  const pageInstanceIds = getPagesToAudit(state, {}).map(
    (page) =>
      new Set(getInstanceDepths(instances, [page.rootInstanceId]).keys())
  );
  const getRelatedInstanceIds = (instanceId: string) =>
    instanceIds ?? getRelatedPageInstanceIds(instanceId, pageInstanceIds);
  const isInScope = (instanceId: string) =>
    instanceIds === undefined || instanceIds.has(instanceId);
  const matches: Array<Record<string, unknown> & { kind: string }> = [];

  if (scopes.has("instances")) {
    for (const instance of state.instances.values()) {
      if (
        isInScope(instance.id) &&
        matchesQuery(
          input.query,
          instance.id,
          instance.component,
          instance.tag,
          instance.label
        )
      ) {
        matches.push({
          kind: "instance",
          instanceId: instance.id,
          component: instance.component,
          tag: instance.tag,
          label: instance.label,
        });
      }
    }
  }

  if (scopes.has("text")) {
    for (const instance of state.instances.values()) {
      if (isInScope(instance.id) === false) {
        continue;
      }
      for (const [childIndex, child] of instance.children.entries()) {
        if (
          (child.type === "text" || child.type === "expression") &&
          matchesQuery(input.query, child.value)
        ) {
          matches.push({
            kind: "text",
            instanceId: instance.id,
            childIndex,
            mode: child.type,
            value: child.value,
          });
        }
      }
    }
  }

  if (scopes.has("props")) {
    for (const prop of state.props.values()) {
      if (
        isInScope(prop.instanceId) &&
        matchesQuery(input.query, prop.id, prop.name, prop.value)
      ) {
        matches.push({
          kind: "prop",
          propId: prop.id,
          instanceId: prop.instanceId,
          name: prop.name,
          type: prop.type,
          value: prop.value,
        });
      }
    }
  }

  if (scopes.has("resources")) {
    for (const resource of state.resources.values()) {
      const scopedDataSources = Array.from(state.dataSources.values()).filter(
        (dataSource) =>
          dataSource.type === "resource" &&
          dataSource.resourceId === resource.id
      );
      if (
        instanceIds !== undefined &&
        scopedDataSources.length > 0 &&
        scopedDataSources.some(
          (dataSource) =>
            dataSource.scopeInstanceId !== undefined &&
            instanceIds.has(dataSource.scopeInstanceId)
        ) === false
      ) {
        continue;
      }
      if (matchesQuery(input.query, resource.id, resource.name, resource.url)) {
        matches.push({
          kind: "resource",
          resourceId: resource.id,
          name: resource.name,
          method: resource.method,
          url: resource.url,
        });
      }
    }
  }

  if (scopes.has("assets")) {
    if (input.query === undefined) {
      for (const asset of listAssets(state, { withUsage: true }).items) {
        if (asset.usageCount !== 0) {
          continue;
        }
        matches.push({
          kind: "asset",
          issue: "unused-asset",
          assetId: asset.id,
          type: asset.type,
          name: asset.name,
          message: "Asset has no project references.",
        });
      }
    } else {
      for (const asset of state.assets.values()) {
        if (
          matchesQuery(
            input.query,
            asset.id,
            asset.name,
            asset.filename,
            asset.description
          )
        ) {
          matches.push({
            kind: "asset",
            assetId: asset.id,
            type: asset.type,
            name: asset.name,
            filename: asset.filename,
            description: asset.description,
          });
        }
      }
    }
  }

  if (scopes.has("styles")) {
    const designTokens = listDesignTokens(state, {
      withUsage: true,
    }).tokens;
    for (const token of designTokens) {
      if (
        input.query !== undefined &&
        matchesQuery(input.query, token.id, token.name) === false
      ) {
        continue;
      }
      if (input.query === undefined && token.usageCount !== 0) {
        continue;
      }
      matches.push({
        kind: "design-token",
        ...(input.query === undefined ? { issue: "unused-design-token" } : {}),
        designTokenId: token.id,
        name: token.name,
        declarationCount: token.declarationCount,
        usageCount: token.usageCount,
        ...(input.query === undefined
          ? { message: "Design token has no element assignments." }
          : {}),
      });
    }

    if (input.query === undefined) {
      const declarationsByStyleSourceId = new Map<string, StyleDecl[]>();
      for (const declaration of state.styles.values()) {
        const declarations =
          declarationsByStyleSourceId.get(declaration.styleSourceId) ?? [];
        declarations.push(declaration);
        declarationsByStyleSourceId.set(
          declaration.styleSourceId,
          declarations
        );
      }
      const instancesByStyleSourceId = new Map<string, Set<string>>();
      for (const selection of state.styleSourceSelections.values()) {
        for (const styleSourceId of selection.values) {
          const instanceIds =
            instancesByStyleSourceId.get(styleSourceId) ?? new Set<string>();
          instanceIds.add(selection.instanceId);
          instancesByStyleSourceId.set(styleSourceId, instanceIds);
        }
      }

      for (const instance of state.instances.values()) {
        if (instance.component !== "ws:collection") {
          continue;
        }
        const selection = state.styleSourceSelections.get(instance.id);
        for (const styleSourceId of selection?.values ?? []) {
          const declarationCount =
            declarationsByStyleSourceId.get(styleSourceId)?.length ?? 0;
          if (declarationCount === 0) {
            continue;
          }
          matches.push({
            kind: "style-source",
            issue: "style-on-dom-transparent-component",
            instanceId: instance.id,
            styleSourceId,
            component: instance.component,
            declarationCount,
            message:
              "Collection does not render a DOM wrapper, so styles assigned directly to it have no visual effect.",
          });
        }
      }

      for (const variable of listCssVariables(state, { withUsage: true })
        .vars) {
        if (variable.usageCount !== 0) {
          continue;
        }
        matches.push({
          kind: "css-variable",
          issue: "unused-css-variable",
          name: variable.name,
          scope: variable.scope,
          usageCount: variable.usageCount,
          message:
            "CSS variable has no references. Remove it or use it in a style or embed.",
        });
      }

      for (const styleSource of state.styleSources.values()) {
        if (styleSource.type !== "local") {
          continue;
        }
        const declarationCount =
          declarationsByStyleSourceId.get(styleSource.id)?.length ?? 0;
        const usageCount =
          instancesByStyleSourceId.get(styleSource.id)?.size ?? 0;
        if (declarationCount === 0 || usageCount > 0) {
          continue;
        }
        matches.push({
          kind: "style-source",
          issue: "unused-local-style-source",
          styleSourceId: styleSource.id,
          declarationCount,
          message:
            "Local style source has declarations but is not assigned to any element.",
        });
      }

      const breakpointIdsWithDeclarations = new Set(
        Array.from(
          state.styles.values(),
          (declaration) => declaration.breakpointId
        )
      );
      for (const declaration of state.styles.values()) {
        if (
          declaration.state !== undefined &&
          validateSelector(declaration.state).success === false
        ) {
          matches.push({
            kind: "style",
            issue: "invalid-style-state-selector",
            styleSourceId: declaration.styleSourceId,
            breakpointId: declaration.breakpointId,
            stateSelector: declaration.state,
            styleProperty: declaration.property,
            message:
              "Style state selector is not safely scoped to its element and may generate invalid or escaping CSS.",
          });
        }
        if (state.breakpoints.has(declaration.breakpointId) === false) {
          matches.push({
            kind: "style",
            issue: "orphan-style-breakpoint",
            styleSourceId: declaration.styleSourceId,
            breakpointId: declaration.breakpointId,
            stateSelector: declaration.state,
            styleProperty: declaration.property,
            message:
              "Style declaration references a breakpoint that no longer exists and therefore cannot render.",
          });
        }
      }
      for (const breakpoint of state.breakpoints.values()) {
        if (isBaseWidthBreakpoint(breakpoint)) {
          continue;
        }
        if (breakpointIdsWithDeclarations.has(breakpoint.id) === false) {
          matches.push({
            kind: "breakpoint",
            issue: "unused-breakpoint",
            breakpointId: breakpoint.id,
            label: breakpoint.label,
            message:
              "Breakpoint has no style declarations. Remove it or add responsive styles.",
          });
        }
      }

      const tokensByDeclarationSignature = new Map<
        string,
        Array<{ id: string; name: string }>
      >();
      for (const token of designTokens) {
        const declarations = [
          ...(declarationsByStyleSourceId.get(token.id) ?? []),
        ].sort((left, right) =>
          `${left.breakpointId}:${left.state ?? ""}:${left.property}`.localeCompare(
            `${right.breakpointId}:${right.state ?? ""}:${right.property}`
          )
        );
        if (declarations.length === 0) {
          continue;
        }
        const signature = JSON.stringify(
          declarations.map(({ breakpointId, state, property, value }) => ({
            breakpointId,
            state,
            property,
            value,
          }))
        );
        const tokens = tokensByDeclarationSignature.get(signature) ?? [];
        tokens.push({ id: token.id, name: token.name });
        tokensByDeclarationSignature.set(signature, tokens);
      }
      for (const tokens of tokensByDeclarationSignature.values()) {
        if (tokens.length < 2) {
          continue;
        }
        matches.push({
          kind: "design-token",
          issue: "duplicate-design-token-declarations",
          designTokenIds: tokens.map((token) => token.id),
          names: tokens.map((token) => token.name),
          message:
            "Design tokens have identical declarations. Review whether they are intentional aliases or can be consolidated.",
        });
      }
    }
  }

  if (
    scopes.has("performance") &&
    input.query === undefined &&
    state.projectSettings?.compiler.atomicStyles === false
  ) {
    matches.push({
      kind: "performance",
      issue: "atomic-css-disabled",
      atomicStyles: false,
      message:
        "Atomic CSS generation is disabled. Published CSS may be substantially larger.",
    });
  }

  if (scopes.has("accessibility")) {
    const propsByInstance = new Map<string, Map<string, unknown>>();
    const propTypesByInstance = new Map<string, Map<string, string>>();
    const staticIdByInstance = new Map<string, string>();
    const staticAriaReferencesByName = new Map<string, Map<string, string>>(
      ariaIdReferenceAttributes.map((name) => [name, new Map<string, string>()])
    );
    for (const prop of state.props.values()) {
      const props = propsByInstance.get(prop.instanceId) ?? new Map();
      props.set(
        prop.name,
        isDynamicPropType(prop.type) ? undefined : prop.value
      );
      propsByInstance.set(prop.instanceId, props);
      const propTypes = propTypesByInstance.get(prop.instanceId) ?? new Map();
      propTypes.set(prop.name, prop.type);
      propTypesByInstance.set(prop.instanceId, propTypes);
      if (
        prop.name === "id" &&
        prop.type === "string" &&
        typeof prop.value === "string" &&
        prop.value.trim().length > 0
      ) {
        staticIdByInstance.set(prop.instanceId, prop.value);
      }
      const staticReferences = staticAriaReferencesByName.get(prop.name);
      if (
        staticReferences !== undefined &&
        prop.type === "string" &&
        typeof prop.value === "string" &&
        prop.value.trim().length > 0
      ) {
        staticReferences.set(prop.instanceId, prop.value);
      }
    }
    const parentIdsByInstance = createParentIdsByInstance(state.instances);
    for (const instance of state.instances.values()) {
      if (isInScope(instance.id) === false) {
        continue;
      }
      const props = propsByInstance.get(instance.id);
      const propTypes = propTypesByInstance.get(instance.id);
      if (
        (instance.component === "Image" || instance.tag === "img") &&
        props?.has("alt") !== true
      ) {
        matches.push({
          kind: "accessibility",
          issue: "missing-alt",
          instanceId: instance.id,
          component: instance.component,
          message: "Image has no alt prop.",
        });
      } else if (instance.component === "Image" || instance.tag === "img") {
        const altType = propTypes?.get("alt");
        const altValue = props?.get("alt");
        const asset =
          altType === "asset" && typeof altValue === "string"
            ? state.assets.get(altValue)
            : undefined;
        if (
          altType === "asset" &&
          (asset === undefined || asset.description == null)
        ) {
          matches.push({
            kind: "accessibility",
            issue: "missing-image-description",
            instanceId: instance.id,
            component: instance.component,
            ...(asset === undefined ? {} : { assetId: asset.id }),
            message: "Image asset has no description or decorative marker.",
          });
        }
      }
      const inputType = props?.get("type");
      if (
        instance.tag === "input" &&
        propTypes?.get("type") === "string" &&
        typeof inputType === "string" &&
        inputType.toLocaleLowerCase() === "image" &&
        hasDynamicProp(propTypes, "alt") === false &&
        hasNonEmptyProp(props, "alt") === false
      ) {
        matches.push({
          kind: "accessibility",
          issue: "missing-image-input-alt",
          instanceId: instance.id,
          component: instance.component,
          message: "Image submit input has no accessible alt label.",
        });
      }
      if (
        instance.tag === "iframe" &&
        hasDynamicProp(propTypes, "title") === false &&
        hasNonEmptyProp(props, "title") === false
      ) {
        matches.push({
          kind: "accessibility",
          issue: "missing-iframe-title",
          instanceId: instance.id,
          component: instance.component,
          message: "Iframe has no title prop.",
        });
      }
      if (
        isInteractiveInstance({ ...instance, props }) &&
        hasDynamicProp(propTypes, "aria-label", "aria-labelledby", "title") ===
          false &&
        hasAccessibleName({
          instanceId: instance.id,
          instances: state.instances,
          propsByInstance,
          propTypesByInstance,
        }) === false
      ) {
        matches.push({
          kind: "accessibility",
          issue: "missing-accessible-name",
          instanceId: instance.id,
          component: instance.component,
          tag: instance.tag,
          message:
            "Interactive element has no visible text or accessible name.",
        });
      }
      if (
        isLabelableFormControl({
          component: instance.component,
          tag: instance.tag,
          props,
        }) &&
        hasDynamicProp(propTypes, "aria-label", "aria-labelledby", "title") ===
          false &&
        hasAccessibleName({
          instanceId: instance.id,
          instances: state.instances,
          propsByInstance,
          propTypesByInstance,
        }) === false &&
        hasAssociatedFormLabel({
          instanceId: instance.id,
          instances: state.instances,
          propsByInstance,
          parentIdsByInstance,
          relatedInstanceIds: getRelatedInstanceIds(instance.id),
        }) === false
      ) {
        matches.push({
          kind: "accessibility",
          issue: "missing-form-label",
          instanceId: instance.id,
          component: instance.component,
          tag: instance.tag,
          message: "Form control has no accessible name or associated label.",
        });
      }
      const tabIndex = props?.get("tabindex");
      const hasNonNegativeTabIndex =
        propTypes?.get("tabindex") === "number" &&
        typeof tabIndex === "number" &&
        tabIndex >= 0;
      const isFocusable =
        isInteractiveInstance({ ...instance, props }) ||
        isLabelableFormControl({
          component: instance.component,
          tag: instance.tag,
          props,
        }) ||
        hasNonNegativeTabIndex;
      const role = props?.get("role");
      if (propTypes?.get("role") === "string" && typeof role === "string") {
        const roleDefinition = ariaRoles.get(role as never);
        if (roleDefinition === undefined) {
          matches.push({
            kind: "accessibility",
            issue: "invalid-aria-role",
            instanceId: instance.id,
            component: instance.component,
            tag: instance.tag,
            role,
            message: `Role ${JSON.stringify(role)} is not a known ARIA role.`,
          });
        } else {
          const allowedProps = new Set(Object.keys(roleDefinition.props));
          for (const [name, value] of props ?? []) {
            if (
              name.startsWith("aria-") &&
              propTypes?.get(name) !== "expression" &&
              allowedProps.has(name) === false
            ) {
              matches.push({
                kind: "accessibility",
                issue: "unsupported-aria-role-property",
                instanceId: instance.id,
                component: instance.component,
                tag: instance.tag,
                role,
                name,
                value,
                message: `${name} is not supported by role ${JSON.stringify(role)}.`,
              });
            }
          }
          for (const name of Object.keys(roleDefinition.requiredProps)) {
            if (props?.has(name) === true) {
              continue;
            }
            matches.push({
              kind: "accessibility",
              issue: "missing-required-aria-role-property",
              instanceId: instance.id,
              component: instance.component,
              tag: instance.tag,
              role,
              name,
              message: `${role} requires ${name}.`,
            });
          }
        }
      }
      if (
        propTypes?.get("role") === "string" &&
        (role === "button" || role === "link") &&
        ((role === "button" && instance.tag !== "button") ||
          (role === "link" && instance.tag !== "a")) &&
        hasNonNegativeTabIndex === false
      ) {
        matches.push({
          kind: "accessibility",
          issue: "role-interactive-not-focusable",
          instanceId: instance.id,
          component: instance.component,
          tag: instance.tag,
          role,
          message: `Non-native element with role ${JSON.stringify(role)} is not keyboard-focusable.`,
        });
      }
      if (
        isFocusable &&
        (props?.get("aria-hidden") === true ||
          props?.get("aria-hidden") === "true") &&
        (propTypes?.get("aria-hidden") === "boolean" ||
          propTypes?.get("aria-hidden") === "string")
      ) {
        matches.push({
          kind: "accessibility",
          issue: "aria-hidden-focusable",
          instanceId: instance.id,
          component: instance.component,
          tag: instance.tag,
          message:
            "Focusable element is hidden from assistive technology with aria-hidden.",
        });
      }
      if (
        propTypes?.get("tabindex") === "number" &&
        typeof tabIndex === "number" &&
        tabIndex > 0
      ) {
        matches.push({
          kind: "accessibility",
          issue: "positive-tabindex",
          instanceId: instance.id,
          component: instance.component,
          tag: instance.tag,
          tabindex: tabIndex,
          message:
            "Positive tabindex changes the natural keyboard focus order.",
        });
      }
      for (const [name, validValues] of ariaLiteralValues) {
        const value = props?.get(name);
        const type = propTypes?.get(name);
        if (
          value === undefined ||
          (typeof value !== "boolean" && typeof value !== "string") ||
          type === "expression" ||
          validValues.has(value) ||
          (type !== "boolean" && type !== "string")
        ) {
          continue;
        }
        matches.push({
          kind: "accessibility",
          issue: "invalid-aria-state",
          instanceId: instance.id,
          component: instance.component,
          tag: instance.tag,
          name,
          value,
          message: `${name} has an unsupported static value ${JSON.stringify(value)}.`,
        });
      }
      for (const name of ariaNumberAttributes) {
        const value = props?.get(name);
        const type = propTypes?.get(name);
        if (
          value === undefined ||
          type === "expression" ||
          (type !== "number" && type !== "string") ||
          (typeof value !== "number" && typeof value !== "string") ||
          isStaticAriaNumber(value)
        ) {
          continue;
        }
        matches.push({
          kind: "accessibility",
          issue: "invalid-aria-number",
          instanceId: instance.id,
          component: instance.component,
          tag: instance.tag,
          name,
          value,
          message: `${name} must have a static numeric value.`,
        });
      }
      if (
        (instance.tag === "audio" || instance.tag === "video") &&
        propTypes?.get("autoplay") === "boolean" &&
        props?.get("autoplay") === true &&
        props?.get("muted") !== true
      ) {
        matches.push({
          kind: "accessibility",
          issue: "autoplay-media-with-sound",
          instanceId: instance.id,
          component: instance.component,
          tag: instance.tag,
          message: "Autoplaying media is not muted.",
        });
      }
    }

    for (const instance of state.instances.values()) {
      if (
        isInScope(instance.id) === false ||
        isLabelInstance(instance) === false
      ) {
        continue;
      }
      const htmlFor = getLabelTargetId(propsByInstance.get(instance.id));
      if (typeof htmlFor !== "string" || htmlFor.trim().length === 0) {
        continue;
      }
      const relatedInstanceIds = getRelatedInstanceIds(instance.id);
      const target = Array.from(state.instances.values()).find(
        (candidate) =>
          (relatedInstanceIds === undefined ||
            relatedInstanceIds.has(candidate.id)) &&
          staticIdByInstance.get(candidate.id) === htmlFor
      );
      if (
        target !== undefined &&
        isLabelableFormControl({
          component: target.component,
          tag: target.tag,
          props: propsByInstance.get(target.id),
        })
      ) {
        continue;
      }
      matches.push({
        kind: "accessibility",
        issue: "invalid-label-reference",
        instanceId: instance.id,
        htmlFor,
        message: `Label references missing or non-labelable control ${JSON.stringify(htmlFor)}.`,
      });
    }

    for (const page of getPagesToAudit(state, input)) {
      const instances = state.instances;
      if (
        instances === undefined ||
        instances.has(page.rootInstanceId) === false
      ) {
        continue;
      }
      const pageInstances = Array.from(
        getInstanceDepths(instances, [page.rootInstanceId]).keys()
      ).flatMap((instanceId) => {
        const instance = instances.get(instanceId);
        return instance === undefined ? [] : [instance];
      });
      const headings = pageInstances.flatMap((instance) => {
        const level = getHeadingLevel(instance.tag);
        return level === undefined ? [] : [{ instance, level }];
      });
      if (headings.some(({ level }) => level === 1) === false) {
        matches.push({
          kind: "accessibility",
          issue: "missing-page-heading",
          pageId: page.id,
          pagePath: page.path,
          message: "Page has no h1 heading.",
        });
      }
      for (const [index, heading] of headings.entries()) {
        const previous = headings[index - 1];
        if (previous !== undefined && heading.level > previous.level + 1) {
          matches.push({
            kind: "accessibility",
            issue: "skipped-heading-level",
            pageId: page.id,
            pagePath: page.path,
            instanceId: heading.instance.id,
            fromLevel: previous.level,
            toLevel: heading.level,
            message: `Heading level jumps from h${previous.level} to h${heading.level}.`,
          });
        }
      }
      const mainLandmarks = pageInstances.filter(
        (instance) => instance.tag === "main"
      );
      if (mainLandmarks.length === 0) {
        matches.push({
          kind: "accessibility",
          issue: "missing-main-landmark",
          pageId: page.id,
          pagePath: page.path,
          message: "Page has no main landmark.",
        });
      }
      if (mainLandmarks.length > 1) {
        matches.push({
          kind: "accessibility",
          issue: "multiple-main-landmarks",
          pageId: page.id,
          pagePath: page.path,
          instanceIds: mainLandmarks.map((instance) => instance.id),
          message: "Page has multiple main landmarks.",
        });
      }
      const instancesByIdValue = new Map<string, string[]>();
      for (const instance of pageInstances) {
        const id = staticIdByInstance.get(instance.id);
        if (id === undefined) {
          continue;
        }
        const matchingInstances = instancesByIdValue.get(id) ?? [];
        matchingInstances.push(instance.id);
        instancesByIdValue.set(id, matchingInstances);
      }
      for (const [id, instanceIds] of instancesByIdValue) {
        if (instanceIds.length < 2) {
          continue;
        }
        matches.push({
          kind: "accessibility",
          issue: "duplicate-id",
          pageId: page.id,
          pagePath: page.path,
          id,
          instanceIds,
          message: `Page has multiple elements with id ${JSON.stringify(id)}.`,
        });
      }
      const ids = new Set(instancesByIdValue.keys());
      for (const [name, referencesByInstance] of staticAriaReferencesByName) {
        for (const instance of pageInstances) {
          const references = referencesByInstance.get(instance.id);
          if (references === undefined) {
            continue;
          }
          for (const id of references.trim().split(/\s+/)) {
            if (ids.has(id)) {
              continue;
            }
            matches.push({
              kind: "accessibility",
              issue: "missing-aria-reference",
              pageId: page.id,
              pagePath: page.path,
              instanceId: instance.id,
              name,
              id,
              message: `${name} references missing id ${JSON.stringify(id)}.`,
            });
          }
        }
      }
    }
  }

  if (scopes.has("security")) {
    for (const dataSource of state.dataSources.values()) {
      if (
        dataSource.type !== "resource" ||
        (instanceIds !== undefined &&
          (dataSource.scopeInstanceId === undefined ||
            instanceIds.has(dataSource.scopeInstanceId) === false))
      ) {
        continue;
      }
      const resource = state.resources.get(dataSource.resourceId);
      if (
        resource === undefined ||
        resource.method === "get" ||
        isAssetsResource(resource)
      ) {
        continue;
      }
      matches.push({
        kind: "security",
        issue: "non-get-resource-exposed-as-data-source",
        instanceId: dataSource.scopeInstanceId,
        dataSourceId: dataSource.id,
        resourceId: resource.id,
        method: resource.method,
        message: `${resource.method.toUpperCase()} resource ${JSON.stringify(resource.name)} is exposed as render-time data.`,
      });
    }
    const propsByInstance = new Map<
      string,
      Map<string, { type: string; value: unknown }>
    >();
    for (const prop of state.props.values()) {
      const props = propsByInstance.get(prop.instanceId) ?? new Map();
      props.set(prop.name, { type: prop.type, value: prop.value });
      propsByInstance.set(prop.instanceId, props);
    }
    for (const instance of state.instances.values()) {
      if (isInScope(instance.id) === false) {
        continue;
      }
      if (
        instance.component !== "Link" &&
        instance.tag !== "a" &&
        instance.tag !== "area"
      ) {
        continue;
      }
      const props = propsByInstance.get(instance.id);
      const target = props?.get("target");
      if (
        target?.type !== "string" ||
        typeof target.value !== "string" ||
        target.value.trim().toLocaleLowerCase() !== "_blank"
      ) {
        continue;
      }
      const rel = props?.get("rel");
      const relTokens =
        rel?.type === "string" && typeof rel.value === "string"
          ? new Set(rel.value.toLocaleLowerCase().split(/\s+/))
          : new Set<string>();
      if (relTokens.has("noopener") || relTokens.has("noreferrer")) {
        continue;
      }
      matches.push({
        kind: "security",
        issue: "target-blank-without-noopener",
        instanceId: instance.id,
        component: instance.component,
        tag: instance.tag,
        message:
          'Link opens a new tab without rel="noopener" or rel="noreferrer".',
      });
    }
  }

  if (scopes.has("seo")) {
    const codePropsByInstance = new Map(
      Array.from(state.props.values(), (prop) => [
        `${prop.instanceId}:${prop.name}`,
        prop,
      ])
    );
    for (const instance of state.instances.values()) {
      if (instance.component !== "JsonLd" || isInScope(instance.id) === false) {
        continue;
      }
      const codeProp = codePropsByInstance.get(`${instance.id}:code`);
      if (codeProp !== undefined && isDynamicPropType(codeProp.type)) {
        continue;
      }
      const validation = validateJsonLdWithSchemaOrg(codeProp?.value);
      const structuralError = validation.diagnostics.find(
        ({ severity }) => severity === "error"
      );
      if (validation.success === false || structuralError !== undefined) {
        matches.push({
          kind: "seo",
          issue: "invalid-json-ld",
          instanceId: instance.id,
          propName: "code",
          jsonLdPath: structuralError?.path ?? "$",
          message:
            structuralError?.message ??
            "JSON-LD code is not a valid JSON object or array.",
        });
        continue;
      }
      for (const diagnostic of validation.diagnostics) {
        matches.push({
          kind: "seo",
          issue: diagnostic.code,
          instanceId: instance.id,
          propName: "code",
          jsonLdPath: diagnostic.path,
          message: diagnostic.message,
        });
      }
      if (hasTopLevelJsonLdContext(validation.value) === false) {
        matches.push({
          kind: "seo",
          issue: "missing-json-ld-context",
          instanceId: instance.id,
          propName: "code",
          message: "JSON-LD has no top-level @context.",
        });
      }
    }

    const pages = getPagesToAudit(state, input);
    const pagesByTitle = new Map<
      string,
      Array<{ id: string; name: string; path: string; title: string }>
    >();
    const pagesByDescription = new Map<
      string,
      Array<{ id: string; name: string; path: string; description: string }>
    >();
    const selectedPageIds = new Set(pages.map((page) => page.id));
    for (const page of pages) {
      for (const customMeta of page.meta.custom ?? []) {
        if (customMeta.property.toLocaleLowerCase().includes("ld+json")) {
          matches.push({
            kind: "seo",
            issue: "json-ld-in-custom-metadata",
            pageId: page.id,
            pagePath: page.path,
            pageName: page.name,
            property: customMeta.property,
            message: `${JSON.stringify(customMeta.property)} custom metadata does not create a JSON-LD script.`,
          });
        }
      }
      if (page.meta.description === undefined) {
        matches.push({
          kind: "seo",
          issue: "missing-page-description",
          pageId: page.id,
          pagePath: page.path,
          pageName: page.name,
          message: "Page has no meta description.",
        });
      }
      const description =
        page.meta.description === undefined
          ? undefined
          : getStaticString(page.meta.description);
      if (description !== undefined && description.trim().length === 0) {
        matches.push({
          kind: "seo",
          issue: "empty-page-description",
          pageId: page.id,
          pagePath: page.path,
          pageName: page.name,
          message: "Page has an empty meta description.",
        });
      }
      const language =
        page.meta.language === undefined
          ? undefined
          : getStaticString(page.meta.language);
      if (
        language !== undefined &&
        language.trim().length > 0 &&
        bcp47.parse(language).language === null
      ) {
        matches.push({
          kind: "seo",
          issue: "invalid-page-language",
          pageId: page.id,
          pagePath: page.path,
          pageName: page.name,
          language,
          message: `Page language ${JSON.stringify(language)} is not a valid BCP-47 language tag.`,
        });
      }
      const socialImageAssetId = page.meta.socialImageAssetId;
      if (
        socialImageAssetId !== undefined &&
        state.assets.has(socialImageAssetId) === false
      ) {
        matches.push({
          kind: "seo",
          issue: "missing-social-image-asset",
          pageId: page.id,
          pagePath: page.path,
          pageName: page.name,
          assetId: socialImageAssetId,
          message: "Page social image references an asset that does not exist.",
        });
      }
      const title = getStaticString(page.title);
      if (title !== undefined) {
        const normalizedTitle = title.trim().toLocaleLowerCase();
        if (normalizedTitle.length === 0) {
          matches.push({
            kind: "seo",
            issue: "empty-page-title",
            pageId: page.id,
            pagePath: page.path,
            pageName: page.name,
            message: "Page has an empty title.",
          });
        }
      }
    }
    for (const page of getPagesToAudit(state, {})) {
      const title = getStaticString(page.title);
      if (title !== undefined && title.trim().length > 0) {
        const key = title.trim().toLocaleLowerCase();
        const matchingPages = pagesByTitle.get(key) ?? [];
        matchingPages.push({
          id: page.id,
          name: page.name,
          path: page.path,
          title,
        });
        pagesByTitle.set(key, matchingPages);
      }
      const description =
        page.meta.description === undefined
          ? undefined
          : getStaticString(page.meta.description);
      if (description !== undefined && description.trim().length > 0) {
        const key = description.trim().toLocaleLowerCase();
        const matchingPages = pagesByDescription.get(key) ?? [];
        matchingPages.push({
          id: page.id,
          name: page.name,
          path: page.path,
          description,
        });
        pagesByDescription.set(key, matchingPages);
      }
    }
    for (const matchingPages of pagesByTitle.values()) {
      if (
        matchingPages.length < 2 ||
        matchingPages.some((page) => selectedPageIds.has(page.id)) === false
      ) {
        continue;
      }
      matches.push({
        kind: "seo",
        issue: "duplicate-page-title",
        title: matchingPages[0].title,
        pageIds: matchingPages.map((page) => page.id),
        pagePaths: matchingPages.map((page) => page.path),
        message: `Pages share the static title ${JSON.stringify(matchingPages[0].title)}.`,
      });
    }
    for (const matchingPages of pagesByDescription.values()) {
      if (
        matchingPages.length < 2 ||
        matchingPages.some((page) => selectedPageIds.has(page.id)) === false
      ) {
        continue;
      }
      matches.push({
        kind: "seo",
        issue: "duplicate-page-description",
        description: matchingPages[0].description,
        pageIds: matchingPages.map((page) => page.id),
        pagePaths: matchingPages.map((page) => page.path),
        message: `Pages share the static meta description ${JSON.stringify(matchingPages[0].description)}.`,
      });
    }
  }

  const limit = input.limit ?? 20;
  return {
    query: input.query,
    scopes: [...scopes],
    total: matches.length,
    truncated: matches.length > limit,
    matches: matches.slice(0, limit),
  };
};

export const searchProject = (
  state: BuilderState,
  input: z.infer<typeof projectSearchInput>
) => {
  const matches = collectProjectSearchMatches(state, input);
  const { items, ...pagination } = paginateOutput({
    items: matches,
    cursor: input.cursor,
    limit: input.limit,
    filters: {
      query: input.query,
      scopes: input.scopes,
      pageId: input.pageId,
      pagePath: input.pagePath,
    },
    verbose: input.verbose,
  });
  return {
    query: input.query,
    scopes: [...(input.scopes ?? defaultProjectSearchScopes)],
    matches: items,
    truncated: pagination.nextCursor !== null,
    ...pagination,
  };
};
