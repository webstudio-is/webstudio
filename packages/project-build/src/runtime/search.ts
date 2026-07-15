import { z } from "zod";
import { isLiteralExpression, type StyleDecl } from "@webstudio-is/sdk";
import { hasTopLevelJsonLdContext } from "@webstudio-is/sdk/runtime";
import { validateJsonLdWithSchemaOrg } from "@webstudio-is/sdk/schema-org";
import { ariaAttributes, ariaRoles } from "@webstudio-is/html-data";
import * as bcp47 from "bcp-47";
import type { BuilderState } from "../state/builder-state";
import { throwBuilderRuntimeError } from "./errors";
import { computeExpression } from "./data";
import { listAssets } from "./assets";
import { listCssVariables, listDesignTokens } from "./styles";
import { getInstanceDepths } from "./instances";
import { isBaseBreakpoint } from "./breakpoints";
import { findSerializedPageByInput, getSerializedPages } from "./pages";
import { validatePageSelector } from "./page-selector";
import { hasAccessibleName, isDynamicPropType } from "./accessibility-analysis";

const projectLookupScope = z.enum([
  "instances",
  "text",
  "props",
  "resources",
  "assets",
  "styles",
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
    limit: z.number().int().min(1).max(200).optional(),
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

const defaultScopes = projectLookupScope.options;

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
      propsByInstance.get(label.id)?.get("for") === id &&
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
      for (const breakpoint of state.breakpoints.values()) {
        if (
          breakpoint.condition === undefined &&
          isBaseBreakpoint(breakpoint)
        ) {
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
      const htmlFor = propsByInstance.get(instance.id)?.get("for");
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
      if (resource === undefined || resource.method === "get") {
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

  const limit = input.limit ?? 50;
  return {
    query: input.query,
    scopes: [...scopes],
    total: matches.length,
    truncated: matches.length > limit,
    matches: matches.slice(0, limit),
  };
};

export const searchProject = (
  state: Parameters<typeof analyzeProject>[0],
  input: z.infer<typeof projectSearchInput>
) => ({ ...analyzeProject(state, input), query: input.query });
