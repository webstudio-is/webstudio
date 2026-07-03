import { z } from "zod";
import { nanoid } from "nanoid";
import deepEqual from "fast-deep-equal";
import { camelCaseProperty } from "@webstudio-is/css-data";
import { styleValue, toValue, type StyleValue } from "@webstudio-is/css-engine";
import {
  getStyleDeclKey,
  styleDecl as styleDeclSchema,
  type Breakpoint,
  type Breakpoints,
  type Instance,
  type Prop,
  type StyleDecl,
  type StyleSource,
  type StyleSourceSelection,
  type StyleSourceSelections,
  type StyleSources,
  type Styles,
} from "@webstudio-is/sdk";
import type { BuilderPatch, BuilderPatchChange } from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import {
  findSerializedPageByInput,
  getHomePageRootInstanceId,
  getSerializedPages,
} from "./pages";
import { getInstanceDepths } from "./instances";
import { throwBuilderRuntimeError } from "./errors";
import { createRuntimeMutation } from "./mutation";
import { serializeStyleDeclarations } from "./style-utils";
import { createPropValue } from "./props";
import { getStyleSourceStylesSignature } from "./style-copy";
import { isBaseBreakpoint } from "./breakpoints";

export const serializeDesignTokens = ({
  styleSources,
  styles,
  styleSourceSelections,
  filter,
  withUsage,
  sort,
}: {
  styleSources: Iterable<StyleSource> | Map<string, StyleSource>;
  styles: Iterable<StyleDecl> | Map<string, StyleDecl>;
  styleSourceSelections:
    | Iterable<StyleSourceSelection>
    | Map<string, StyleSourceSelection>;
  filter?: string;
  withUsage?: boolean;
  sort?: "name" | "usage";
}) => {
  const shouldCountUsage = withUsage === true || sort === "usage";
  const styleDecls =
    styles instanceof Map ? Array.from(styles.values()) : Array.from(styles);
  const selections =
    styleSourceSelections instanceof Map
      ? Array.from(styleSourceSelections.values())
      : Array.from(styleSourceSelections);
  const tokens = (
    styleSources instanceof Map
      ? Array.from(styleSources.values())
      : Array.from(styleSources)
  )
    .filter((styleSource) => styleSource.type === "token")
    .filter(
      (styleSource) => filter === undefined || styleSource.name.includes(filter)
    )
    .map((styleSource) => {
      const tokenStyles = Object.fromEntries(
        styleDecls
          .filter((style) => style.styleSourceId === styleSource.id)
          .map((style) => [style.property, style.value])
      );
      const usageCount = selections.filter((selection) =>
        selection.values.includes(styleSource.id)
      ).length;
      return {
        id: styleSource.id,
        name: styleSource.name,
        styles: tokenStyles,
        usageCount: shouldCountUsage ? usageCount : undefined,
      };
    });

  tokens.sort((left, right) =>
    sort === "usage"
      ? (right.usageCount ?? 0) - (left.usageCount ?? 0)
      : left.name.localeCompare(right.name)
  );
  return { tokens };
};

const getRequiredStyleState = (
  state: Pick<BuilderState, "styles" | "styleSources" | "styleSourceSelections">
) => {
  if (
    state.styles === undefined ||
    state.styleSources === undefined ||
    state.styleSourceSelections === undefined
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Style namespaces are missing"
    );
  }
  return {
    styles: state.styles,
    styleSources: state.styleSources,
    styleSourceSelections: state.styleSourceSelections,
  };
};

export const getStyleDeclarations = (
  state: Pick<
    BuilderState,
    "pages" | "instances" | "styles" | "styleSources" | "styleSourceSelections"
  >,
  input: {
    instanceIds?: string[];
    pageId?: string;
    pagePath?: string;
    breakpoint?: string;
    state?: string;
    property?: string;
    propertyFilter?: string;
    includeTokens?: boolean;
  } = {}
) => {
  const property =
    input.property === undefined
      ? undefined
      : normalizeStyleProperty(input.property);
  const styleState = getRequiredStyleState(state);
  const hasPageFilter =
    input.pageId !== undefined || input.pagePath !== undefined;
  const pages = hasPageFilter ? getSerializedPages(state) : undefined;
  const page =
    pages === undefined ? undefined : findSerializedPageByInput(pages, input);
  if (hasPageFilter && page === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  const pageInstanceIds =
    page === undefined
      ? undefined
      : state.instances === undefined
        ? throwBuilderRuntimeError(
            "BAD_REQUEST",
            "Instances namespace is missing"
          )
        : new Set(
            getInstanceDepths(state.instances, [page.rootInstanceId]).keys()
          );
  const inputInstanceIds =
    input.instanceIds === undefined ? undefined : new Set(input.instanceIds);
  const instanceIds =
    pageInstanceIds === undefined
      ? inputInstanceIds
      : new Set(
          Array.from(inputInstanceIds ?? pageInstanceIds).filter((instanceId) =>
            pageInstanceIds.has(instanceId)
          )
        );
  return {
    declarations: serializeStyleDeclarations({
      styles: styleState.styles.values(),
      styleSources: styleState.styleSources.values(),
      styleSourceSelections: styleState.styleSourceSelections.values(),
      instanceIds,
      breakpoint: input.breakpoint,
      state: input.state,
      property,
      propertyFilter: input.propertyFilter,
      includeTokens: input.includeTokens,
    }),
  };
};

export const listDesignTokens = (
  state: Pick<
    BuilderState,
    "styles" | "styleSources" | "styleSourceSelections"
  >,
  input: {
    filter?: string;
    withUsage?: boolean;
    sort?: "name" | "usage";
  } = {}
) => serializeDesignTokens({ ...getRequiredStyleState(state), ...input });

const DEFAULT_BREAKPOINT_ID = "base";

const normalizeStyleProperty = (property: unknown): StyleDecl["property"] =>
  typeof property === "string"
    ? camelCaseProperty(property as StyleDecl["property"])
    : (property as StyleDecl["property"]);

const getBaseBreakpointId = (breakpoints: Breakpoints | undefined) => {
  const breakpoint = Array.from(breakpoints?.values() ?? []).find(
    isBaseBreakpoint
  );
  return breakpoint?.id ?? DEFAULT_BREAKPOINT_ID;
};

const withDefaultBreakpoint = <Input extends { breakpoint?: string }>(
  input: Input,
  breakpoint: string
): Input => ({
  ...input,
  breakpoint: input.breakpoint ?? breakpoint,
});

export const styleUpdateInput = z.object({
  instanceId: z.string(),
  property: z.string(),
  value: z.unknown(),
  breakpoint: z.string().optional(),
  state: z.string().optional(),
  listed: z.boolean().optional(),
  createLocalIfMissing: z.boolean().optional(),
});

export const styleDeleteInput = z.object({
  instanceId: z.string(),
  property: z.string(),
  breakpoint: z.string().optional(),
  state: z.string().optional(),
});

const jsonArrayStringInput = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const jsonArrayInput = <Item extends z.ZodTypeAny>(item: Item) =>
  z.preprocess(jsonArrayStringInput, z.array(item).min(1));

export const styleUpdateDeclarationsInput = z.object({
  updates: jsonArrayInput(styleUpdateInput),
});

export const styleDeleteDeclarationsInput = z.object({
  deletions: jsonArrayInput(styleDeleteInput),
});

export const styleReplaceInput = z.object({
  property: z.string(),
  fromValue: z.unknown(),
  toValue: z.unknown(),
  pageId: z.string().optional(),
  pagePath: z.string().optional(),
});

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createCssVariableNameRegex = (name: string) =>
  new RegExp(`${escapeRegex(name)}(?![\\w-])`, "g");

export const createCssVariableNamesRegex = (names: Set<string>) => {
  if (names.size === 0) {
    return;
  }
  return new RegExp(
    `(?:${Array.from(names)
      .sort((left, right) => right.length - left.length)
      .map(escapeRegex)
      .join("|")})(?![\\w-])`,
    "g"
  );
};

export const collectCssVariableReferences = (value: string, regex?: RegExp) => {
  const references = new Set<string>();
  if (regex === undefined) {
    return references;
  }
  regex.lastIndex = 0;
  for (const match of value.matchAll(regex)) {
    references.add(match[0]);
  }
  return references;
};

export const rewriteCssVariableReferencesInStyleValue = (
  value: StyleValue,
  replacements: Record<string, string>
) => {
  let serialized = JSON.stringify(value);
  for (const [fromName, toName] of Object.entries(replacements)) {
    serialized = serialized.replace(
      new RegExp(`("value":")${escapeRegex(fromName.slice(2))}(?![\\w-])`, "g"),
      `$1${toName.slice(2)}`
    );
    serialized = serialized.replace(
      createCssVariableNameRegex(fromName),
      toName
    );
  }
  return JSON.parse(serialized) as StyleValue;
};

export const rewriteCssVariableReferencesInString = (
  value: string,
  replacements: Record<string, string>
) => {
  let nextValue = value;
  for (const [fromName, toName] of Object.entries(replacements)) {
    nextValue = nextValue.replace(createCssVariableNameRegex(fromName), toName);
  }
  return nextValue;
};

export const getDefinedCssVariableNames = (styles: Iterable<StyleDecl>) => {
  const names = new Set<string>();
  for (const styleDecl of styles) {
    if (styleDecl.property.startsWith("--")) {
      names.add(styleDecl.property);
    }
  }
  return names;
};

export type CssVariableNameError =
  | { type: "required"; message: string }
  | { type: "invalid"; message: string }
  | { type: "duplicate"; message: string };

export const cssVariableValueInput = z.union([z.string(), styleValue]);

export const cssVariableDefineInput = z.object({
  vars: z.record(cssVariableValueInput),
  overwrite: z.boolean().optional(),
});

export const cssVariableDeleteInput = z.object({
  names: z.array(z.string()).min(1),
  force: z.boolean().optional(),
});

export const cssVariableRewriteRefsInput = z.object({
  map: z.record(z.string()),
  scopeRegex: z.string().optional(),
});

export const validateCssVariableNameWithStyles = ({
  name,
  styles,
  currentProperty,
}: {
  name: string;
  styles: Iterable<StyleDecl>;
  currentProperty?: string;
}): CssVariableNameError | undefined => {
  if (name.trim().length === 0) {
    return {
      type: "required",
      message: "CSS variable name cannot be empty",
    };
  }
  if (name.startsWith("--") === false) {
    return {
      type: "invalid",
      message: 'CSS variable name must start with "--"',
    };
  }
  for (const styleDecl of styles) {
    if (
      styleDecl.property === name &&
      styleDecl.property !== currentProperty &&
      styleDecl.property.startsWith("--")
    ) {
      return {
        type: "duplicate",
        message: `CSS variable "${name}" already exists`,
      };
    }
  }
};

export const getInstanceIdByStyleSourceId = (
  styleSourceSelections: Iterable<StyleSourceSelection>
) => {
  const instanceIdByStyleSourceId = new Map<string, Instance["id"]>();
  for (const selection of styleSourceSelections) {
    for (const styleSourceId of selection.values) {
      instanceIdByStyleSourceId.set(styleSourceId, selection.instanceId);
    }
  }
  return instanceIdByStyleSourceId;
};

const valuesOf = <Value>(
  value: Iterable<Value> | Map<unknown, Value>
): Iterable<Value> => (value instanceof Map ? value.values() : value);

const getCssVariableUsageCounts = ({
  styles,
  props,
}: {
  styles: Iterable<StyleDecl>;
  props: Iterable<Prop>;
}) => {
  const styleList = Array.from(styles);
  const names = getDefinedCssVariableNames(styleList);
  const regex = createCssVariableNamesRegex(names);
  const counts = new Map<string, number>();
  const addReferences = (value: string) => {
    for (const name of collectCssVariableReferences(value, regex)) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  };
  for (const declaration of styleList) {
    addReferences(toValue(declaration.value));
  }
  for (const prop of props) {
    if (prop.type === "string" && prop.name === "code") {
      addReferences(prop.value);
    }
  }
  return counts;
};

export const findCssVariableUsagesByInstance = ({
  styleSourceSelections,
  styles,
  props,
}: {
  styleSourceSelections:
    | Iterable<StyleSourceSelection>
    | Map<string, StyleSourceSelection>;
  styles: Iterable<StyleDecl> | Map<string, StyleDecl>;
  props: Iterable<Prop> | Map<string, Prop>;
}): {
  counts: Map<string, number>;
  instances: Map<string, Set<Instance["id"]>>;
} => {
  const counts = new Map<string, number>();
  const instances = new Map<string, Set<Instance["id"]>>();
  const styleList = Array.from(valuesOf(styles));
  const definedVariables = getDefinedCssVariableNames(styleList);
  if (definedVariables.size === 0) {
    return { counts, instances };
  }
  const definedVariablesRegex = createCssVariableNamesRegex(definedVariables);
  const instancesByStyleSource = getInstanceIdByStyleSourceId(
    valuesOf(styleSourceSelections)
  );

  const addReference = (name: string, instanceId: Instance["id"]) => {
    counts.set(name, (counts.get(name) ?? 0) + 1);
    const instanceIds = instances.get(name) ?? new Set<Instance["id"]>();
    instanceIds.add(instanceId);
    instances.set(name, instanceIds);
  };

  for (const styleDecl of styleList) {
    const instanceId = instancesByStyleSource.get(styleDecl.styleSourceId);
    if (instanceId === undefined) {
      continue;
    }
    for (const name of collectCssVariableReferences(
      toValue(styleDecl.value),
      definedVariablesRegex
    )) {
      addReference(name, instanceId);
    }
  }

  for (const prop of valuesOf(props)) {
    if (prop.type === "string" && prop.name === "code" && prop.value) {
      for (const name of collectCssVariableReferences(
        prop.value,
        definedVariablesRegex
      )) {
        addReference(name, prop.instanceId);
      }
    }
  }

  return { counts, instances };
};

export const getCssVariableDefinitionsByVariable = ({
  styleSourceSelections,
  styles,
}: {
  styleSourceSelections:
    | Iterable<StyleSourceSelection>
    | Map<string, StyleSourceSelection>;
  styles: Iterable<StyleDecl> | Map<string, StyleDecl>;
}) => {
  const definitions = new Map<string, Set<Instance["id"]>>();
  const instancesByStyleSource = getInstanceIdByStyleSourceId(
    valuesOf(styleSourceSelections)
  );

  for (const styleDecl of valuesOf(styles)) {
    if (styleDecl.property.startsWith("--") === false) {
      continue;
    }
    const instanceId = instancesByStyleSource.get(styleDecl.styleSourceId);
    if (instanceId === undefined) {
      continue;
    }
    const instanceIds =
      definitions.get(styleDecl.property) ?? new Set<Instance["id"]>();
    instanceIds.add(instanceId);
    definitions.set(styleDecl.property, instanceIds);
  }

  return definitions;
};

export const getReferencedCssVariables = ({
  styles,
  props,
}: {
  styles: Iterable<StyleDecl> | Map<string, StyleDecl>;
  props: Iterable<Prop> | Map<string, Prop>;
}) => {
  const styleList = Array.from(valuesOf(styles));
  const names = getDefinedCssVariableNames(styleList);
  const regex = createCssVariableNamesRegex(names);
  const referenced = new Set<string>();
  const addReferences = (value: string) => {
    for (const name of collectCssVariableReferences(value, regex)) {
      referenced.add(name);
    }
  };

  for (const styleDecl of styleList) {
    addReferences(toValue(styleDecl.value));
  }
  for (const prop of valuesOf(props)) {
    if (prop.type === "string" && prop.name === "code" && prop.value) {
      addReferences(prop.value);
    }
  }

  return referenced;
};

const toCssVariableStyleValue = (value: string | StyleValue): StyleValue =>
  typeof value === "string" ? { type: "unparsed", value } : value;

const createCssVariableDeclaration = ({
  styleSourceId,
  property,
  value,
  breakpointId,
}: {
  styleSourceId: string;
  property: string;
  value: string | StyleValue;
  breakpointId: string;
}) =>
  createStyleDecl({
    styleSourceId,
    breakpointId,
    property,
    value: toCssVariableStyleValue(value),
  });

const createCssVariableDefinePayload = ({
  vars,
  rootStyleSourceId,
  styles,
  overwrite,
  breakpointId = DEFAULT_BREAKPOINT_ID,
}: {
  vars: Record<string, string | StyleValue>;
  rootStyleSourceId: string;
  styles: Iterable<StyleDecl>;
  overwrite?: boolean;
  breakpointId?: string;
}): {
  payload: BuilderPatchChange[];
  names: string[];
  conflicts: string[];
  styleKeys: string[];
} => {
  const stylesList = Array.from(styles);
  const stylePatches = [];
  const conflicts = [];

  for (const [property, value] of Object.entries(vars)) {
    const existingDeclarations = stylesList.filter(
      (declaration) => declaration.property === property
    );
    if (existingDeclarations.length > 0 && overwrite !== true) {
      conflicts.push(property);
      continue;
    }
    const declarations =
      existingDeclarations.length === 0
        ? [
            createCssVariableDeclaration({
              styleSourceId: rootStyleSourceId,
              property,
              value,
              breakpointId,
            }),
          ]
        : existingDeclarations.map((declaration) =>
            updateStyleDecl(declaration, {
              value: toCssVariableStyleValue(value),
            })
          );
    const existingStyleKeys = new Set(
      existingDeclarations.map((declaration) => getStyleDeclKey(declaration))
    );
    for (const declaration of declarations) {
      const key = getStyleDeclKey(declaration);
      stylePatches.push({
        op: existingStyleKeys.has(key)
          ? ("replace" as const)
          : ("add" as const),
        path: [key],
        value: declaration,
      });
    }
  }

  return {
    payload:
      stylePatches.length === 0
        ? []
        : [{ namespace: "styles", patches: stylePatches }],
    names: Object.keys(vars),
    conflicts,
    styleKeys: stylePatches.map((patch) => String(patch.path[0])),
  };
};

export const createCssVariableRootDefinePayload = ({
  rootInstanceId,
  vars,
  styleSources,
  styleSourceSelections,
  styles,
  overwrite,
  breakpointId = DEFAULT_BREAKPOINT_ID,
  createId,
}: {
  rootInstanceId: Instance["id"];
  vars: Record<string, string | StyleValue>;
  styleSources: Map<StyleSource["id"], StyleSource>;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styles: Iterable<StyleDecl>;
  overwrite?: boolean;
  breakpointId?: string;
  createId: () => StyleSource["id"];
}) => {
  const rootStyleSourceResult = createLocalStyleSourcePatchPlan({
    createdLocalSourceIds: new Map(),
    instanceId: rootInstanceId,
    styleSources,
    styleSourceSelection: Array.from(styleSourceSelections).find(
      (selection) => selection.instanceId === rootInstanceId
    ),
    shouldCreate: true,
    createId,
  });
  if (rootStyleSourceResult === undefined) {
    return {
      payload: [],
      names: Object.keys(vars),
      conflicts: [],
      styleKeys: [],
      missingRootStyleSource: true,
    };
  }
  const result = createCssVariableDefinePayload({
    vars,
    rootStyleSourceId: rootStyleSourceResult.styleSourceId,
    styles,
    overwrite,
    breakpointId,
  });
  return {
    ...result,
    payload: [...rootStyleSourceResult.payload, ...result.payload],
    missingRootStyleSource: false,
  };
};

export const createCssVariableDeletePayload = ({
  names,
  styles,
  props,
  force,
}: {
  names: string[];
  styles: Iterable<StyleDecl>;
  props: Iterable<Prop>;
  force?: boolean;
}): {
  payload: BuilderPatchChange[];
  styleKeys: string[];
  referenced: string[];
} => {
  const styleList = Array.from(styles);
  const usageCounts = getCssVariableUsageCounts({ styles: styleList, props });
  const referenced =
    force === true
      ? []
      : names.filter((name) => (usageCounts.get(name) ?? 0) > 0);
  if (referenced.length > 0) {
    return { payload: [], styleKeys: [], referenced };
  }
  const namesSet = new Set(names);
  const styleKeys = styleList.flatMap((declaration) =>
    namesSet.has(declaration.property) ? [getStyleDeclKey(declaration)] : []
  );

  return {
    payload:
      styleKeys.length === 0
        ? []
        : [
            {
              namespace: "styles",
              patches: styleKeys.map((key) => ({
                op: "remove" as const,
                path: [key],
              })),
            },
          ],
    styleKeys,
    referenced,
  };
};

export const createCssVariableReferenceRewritePayload = ({
  replacements,
  scopeRegex,
  styles,
  props,
  styleSourceSelections,
}: {
  replacements: Record<string, string>;
  scopeRegex?: RegExp;
  styles: Iterable<StyleDecl>;
  props: Iterable<Prop>;
  styleSourceSelections: Iterable<StyleSourceSelection>;
}): {
  payload: BuilderPatchChange[];
  styleKeys: string[];
  propIds: string[];
} => {
  const instanceIdByStyleSourceId = getInstanceIdByStyleSourceId(
    styleSourceSelections
  );
  const stylePatches = [];
  for (const declaration of styles) {
    const scope =
      instanceIdByStyleSourceId.get(declaration.styleSourceId) ??
      declaration.styleSourceId;
    if (scopeRegex !== undefined && scopeRegex.test(scope) === false) {
      continue;
    }
    const value = rewriteCssVariableReferencesInStyleValue(
      declaration.value,
      replacements
    );
    if (JSON.stringify(value) === JSON.stringify(declaration.value)) {
      continue;
    }
    const nextDeclaration = updateStyleDecl(declaration, { value });
    stylePatches.push({
      op: "replace" as const,
      path: [getStyleDeclKey(nextDeclaration)],
      value: nextDeclaration,
    });
  }
  const propPatches = [];
  for (const prop of props) {
    if (prop.type !== "string" || prop.name !== "code") {
      continue;
    }
    if (
      scopeRegex !== undefined &&
      scopeRegex.test(prop.instanceId) === false
    ) {
      continue;
    }
    const value = rewriteCssVariableReferencesInString(
      prop.value,
      replacements
    );
    if (value === prop.value) {
      continue;
    }
    propPatches.push({
      op: "replace" as const,
      path: [prop.id],
      value: createPropValue({ ...prop, value }),
    });
  }
  const payload: BuilderPatchChange[] = [];
  if (stylePatches.length > 0) {
    payload.push({ namespace: "styles", patches: stylePatches });
  }
  if (propPatches.length > 0) {
    payload.push({ namespace: "props", patches: propPatches });
  }

  return {
    payload,
    styleKeys: stylePatches.map((patch) => String(patch.path[0])),
    propIds: propPatches.map((patch) => String(patch.path[0])),
  };
};

export const performCssVariableRename = (
  styles: Map<string, StyleDecl>,
  oldProperty: string,
  newProperty: string
): Map<string, StyleDecl> => {
  const updatedStyles = new Map(styles);
  const definitionsToUpdate = [];
  for (const [key, declaration] of updatedStyles) {
    if (declaration.property === oldProperty) {
      definitionsToUpdate.push({ key, declaration });
    }
  }
  for (const { key, declaration } of definitionsToUpdate) {
    updatedStyles.delete(key);
    const nextDeclaration = {
      ...declaration,
      property: newProperty as StyleDecl["property"],
    };
    updatedStyles.set(getStyleDeclKey(nextDeclaration), nextDeclaration);
  }
  for (const [key, declaration] of updatedStyles) {
    const value = rewriteCssVariableReferencesInStyleValue(declaration.value, {
      [oldProperty]: newProperty,
    });
    if (JSON.stringify(value) !== JSON.stringify(declaration.value)) {
      updatedStyles.set(key, { ...declaration, value });
    }
  }
  return updatedStyles;
};

export const updateVarReferencesInProps = (
  props: Map<string, Prop>,
  oldProperty: string,
  newProperty: string
) => {
  const updatedProps = new Map(props);
  for (const [key, prop] of updatedProps) {
    if (prop.type !== "string" || prop.name !== "code" || prop.value === "") {
      continue;
    }
    const value = rewriteCssVariableReferencesInString(prop.value, {
      [oldProperty]: newProperty,
    });
    if (value !== prop.value) {
      updatedProps.set(key, createPropValue({ ...prop, value }));
    }
  }
  return updatedProps;
};

export const renameCssVariableMutable = ({
  styles,
  props,
  oldProperty,
  newProperty,
}: {
  styles: Map<string, StyleDecl>;
  props: Map<string, Prop>;
  oldProperty: string;
  newProperty: string;
}) => {
  const updatedStyles = performCssVariableRename(
    styles,
    oldProperty,
    newProperty
  );
  styles.clear();
  for (const [key, value] of updatedStyles) {
    styles.set(key, value);
  }

  const updatedProps = updateVarReferencesInProps(
    props,
    oldProperty,
    newProperty
  );
  props.clear();
  for (const [key, value] of updatedProps) {
    props.set(key, value);
  }
};

export const serializeCssVariables = ({
  styles,
  props,
  styleSourceSelections,
  filter,
  withUsage,
}: {
  styles: Iterable<StyleDecl>;
  props: Iterable<Prop>;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  filter?: string;
  withUsage?: boolean;
}) => {
  const instanceIdByStyleSourceId = getInstanceIdByStyleSourceId(
    styleSourceSelections
  );
  const usageCounts =
    withUsage === true
      ? getCssVariableUsageCounts({ styles, props })
      : undefined;
  return {
    vars: Array.from(styles)
      .filter((declaration) => declaration.property.startsWith("--"))
      .filter(
        (declaration) =>
          filter === undefined || declaration.property.includes(filter)
      )
      .map((declaration) => ({
        name: declaration.property,
        value: toValue(declaration.value),
        scope:
          instanceIdByStyleSourceId.get(declaration.styleSourceId) ??
          declaration.styleSourceId,
        usageCount:
          withUsage === true
            ? (usageCounts?.get(declaration.property) ?? 0)
            : undefined,
      })),
  };
};

export const designTokenStyleInput = z.object({
  property: z.string(),
  value: z.unknown(),
  breakpoint: z.string().optional(),
  state: z.string().optional(),
});

export const designTokenCreateInput = z.object({
  tokenId: z.string().optional(),
  name: z.string().min(1),
  styles: z.record(z.unknown()).optional(),
  declarations: z.array(designTokenStyleInput).optional(),
});

export const designTokenCreateManyInput = z.object({
  tokens: jsonArrayInput(designTokenCreateInput),
});

export const designTokenStyleUpdatesInput = z.object({
  designTokenId: z.string(),
  updates: jsonArrayInput(designTokenStyleInput),
});

export const designTokenStyleDeletionsInput = z.object({
  designTokenId: z.string(),
  deletions: jsonArrayInput(styleDeleteInput.omit({ instanceId: true })),
});

export const designTokenAttachInput = z.object({
  designTokenId: z.string(),
  instanceIds: z.array(z.string()).min(1),
  position: z.enum(["before-local", "after-local"]).optional(),
});

export const designTokenDetachInput = z.object({
  designTokenId: z.string(),
  instanceIds: z.array(z.string()).min(1),
});

export const designTokenExtractInput = z.object({
  instanceIds: z.array(z.string()).min(1),
  name: z.string().min(1),
  removeLocalProps: z.array(z.string()).optional(),
});

export const createTokenStyleSource = ({
  id,
  name,
  locked,
}: {
  id: StyleSource["id"];
  name: string;
  locked?: boolean;
}): Extract<StyleSource, { type: "token" }> => ({
  type: "token",
  id,
  name,
  ...(locked === true ? { locked: true } : {}),
});

export const findDesignToken = (
  styleSources: Iterable<StyleSource>,
  tokenId: StyleSource["id"]
) =>
  Array.from(styleSources).find(
    (styleSource) => styleSource.type === "token" && styleSource.id === tokenId
  );

export type RenameStyleSourceError =
  | { type: "minlength"; id: StyleSource["id"] }
  | { type: "duplicate"; id: StyleSource["id"] };

export const validateStyleSourceName = ({
  id,
  name,
  styleSources,
}: {
  id: StyleSource["id"];
  name: string;
  styleSources: StyleSources;
}): RenameStyleSourceError | undefined => {
  if (name.trim().length === 0) {
    return { type: "minlength", id };
  }
  for (const styleSource of styleSources.values()) {
    if (
      styleSource.type === "token" &&
      styleSource.name === name &&
      styleSource.id !== id
    ) {
      return { type: "duplicate", id };
    }
  }
};

export const createDesignTokenStyleInputs = (input: {
  styles?: Record<string, unknown>;
  declarations?: Array<{
    property: string;
    value?: unknown;
    breakpoint?: string;
    state?: StyleDecl["state"];
  }>;
}): Array<{
  property: string;
  value?: unknown;
  breakpoint?: string;
  state?: StyleDecl["state"];
}> => [
  ...Object.entries(input.styles ?? {}).map(([property, value]) => ({
    property,
    value,
  })),
  ...(input.declarations ?? []),
];

export const getLocalStyleSourceId = ({
  styleSources,
  styleSourceSelection,
}: {
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelection: StyleSourceSelection | undefined;
}) =>
  styleSourceSelection?.values.find(
    (styleSourceId) => styleSources.get(styleSourceId)?.type === "local"
  );

export const getOrCreateStyleSourceSelectionMutable = (
  styleSourceSelections: StyleSourceSelections,
  instanceId: Instance["id"]
) => {
  let styleSourceSelection = styleSourceSelections.get(instanceId);
  if (styleSourceSelection === undefined) {
    styleSourceSelection = {
      instanceId,
      values: [],
    };
    styleSourceSelections.set(instanceId, styleSourceSelection);
  }
  return styleSourceSelection;
};

export const getStyleSourceInsertionIndex = ({
  styleSourceIds,
  styleSources,
  position = "before-local",
}: {
  styleSourceIds: StyleSource["id"][];
  styleSources: Pick<StyleSources, "get">;
  position?: "before-local" | "after-local";
}) => {
  const localIndex = styleSourceIds.findIndex(
    (styleSourceId) => styleSources.get(styleSourceId)?.type === "local"
  );
  if (localIndex === -1) {
    return styleSourceIds.length;
  }
  return position === "after-local" ? localIndex + 1 : localIndex;
};

export const isStyleSourceLocked = (styleSource: StyleSource | undefined) =>
  styleSource?.type === "token" && styleSource.locked === true;

type StyleSourceSelectionAddPlan =
  | {
      type: "create";
      selection: StyleSourceSelection;
    }
  | {
      type: "insert";
      index: number;
    }
  | {
      type: "exists";
    };

type StyleSourceSelectionRemovePlan =
  | {
      type: "remove";
      index: number;
    }
  | {
      type: "missing";
    };

export const createStyleSourceSelectionAddPlan = ({
  styleSourceSelection,
  styleSources,
  instanceId,
  styleSourceId,
  position,
}: {
  styleSourceSelection: StyleSourceSelection | undefined;
  styleSources: Pick<StyleSources, "get">;
  instanceId: Instance["id"];
  styleSourceId: StyleSource["id"];
  position?: "before-local" | "after-local";
}): StyleSourceSelectionAddPlan => {
  if (styleSourceSelection === undefined) {
    return {
      type: "create",
      selection: { instanceId, values: [styleSourceId] },
    };
  }
  if (styleSourceSelection.values.includes(styleSourceId)) {
    return { type: "exists" };
  }
  return {
    type: "insert",
    index: getStyleSourceInsertionIndex({
      styleSourceIds: styleSourceSelection.values,
      styleSources,
      position,
    }),
  };
};

export const createStyleSourceSelectionAddPatch = ({
  styleSourceSelection,
  styleSources,
  instanceId,
  styleSourceId,
  position,
}: {
  styleSourceSelection: StyleSourceSelection | undefined;
  styleSources: Pick<StyleSources, "get">;
  instanceId: Instance["id"];
  styleSourceId: StyleSource["id"];
  position?: "before-local" | "after-local";
}) => {
  const plan = createStyleSourceSelectionAddPlan({
    styleSourceSelection,
    styleSources,
    instanceId,
    styleSourceId,
    position,
  });
  if (plan.type === "exists") {
    return;
  }
  if (plan.type === "create") {
    return {
      op: "add" as const,
      path: [instanceId],
      value: plan.selection,
    };
  }
  return {
    op: "add" as const,
    path: [instanceId, "values", plan.index],
    value: styleSourceId,
  };
};

export const createStyleSourceSelectionRemovePlan = ({
  styleSourceSelection,
  styleSourceId,
}: {
  styleSourceSelection: StyleSourceSelection | undefined;
  styleSourceId: StyleSource["id"];
}): StyleSourceSelectionRemovePlan => {
  const index = styleSourceSelection?.values.indexOf(styleSourceId) ?? -1;
  return index === -1 ? { type: "missing" } : { type: "remove", index };
};

export const createStyleSourceSelectionRemovePatch = ({
  styleSourceSelection,
  instanceId,
  styleSourceId,
}: {
  styleSourceSelection: StyleSourceSelection | undefined;
  instanceId: Instance["id"];
  styleSourceId: StyleSource["id"];
}) => {
  const plan = createStyleSourceSelectionRemovePlan({
    styleSourceSelection,
    styleSourceId,
  });
  return plan.type === "missing"
    ? undefined
    : {
        op: "remove" as const,
        path: [instanceId, "values", plan.index],
      };
};

export const addStyleSourceToInstanceMutable = ({
  styleSourceSelections,
  styleSources,
  instanceId,
  styleSourceId,
  position,
}: {
  styleSourceSelections: StyleSourceSelections;
  styleSources: StyleSources;
  instanceId: Instance["id"];
  styleSourceId: StyleSource["id"];
  position?: "before-local" | "after-local";
}) => {
  const styleSourceSelection = styleSourceSelections.get(instanceId);
  const plan = createStyleSourceSelectionAddPlan({
    styleSourceSelection,
    styleSources,
    instanceId,
    styleSourceId,
    position,
  });
  if (plan.type === "exists") {
    return;
  }
  if (plan.type === "create") {
    styleSourceSelections.set(instanceId, plan.selection);
    return;
  }
  styleSourceSelection?.values.splice(plan.index, 0, styleSourceId);
};

export const removeStyleSourceFromInstanceMutable = ({
  styleSourceSelections,
  instanceId,
  styleSourceId,
}: {
  styleSourceSelections: StyleSourceSelections;
  instanceId: Instance["id"];
  styleSourceId: StyleSource["id"];
}) => {
  const styleSourceSelection = styleSourceSelections.get(instanceId);
  const plan = createStyleSourceSelectionRemovePlan({
    styleSourceSelection,
    styleSourceId,
  });
  if (plan.type === "missing") {
    return;
  }
  styleSourceSelection?.values.splice(plan.index, 1);
};

const createStyleSourceSelectionPayload = (
  patches: BuilderPatch[]
): BuilderPatchChange[] =>
  patches.length === 0
    ? []
    : [
        {
          namespace: "styleSourceSelections" as const,
          patches,
        },
      ];

export const createStyleSourceSelectionAttachPayload = ({
  instanceIds,
  styleSourceSelections,
  styleSources,
  styleSourceId,
  position,
}: {
  instanceIds: Instance["id"][];
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styleSources: Pick<StyleSources, "get">;
  styleSourceId: StyleSource["id"];
  position?: "before-local" | "after-local";
}) => {
  const selectionByInstanceId = new Map(
    Array.from(styleSourceSelections, (selection) => [
      selection.instanceId,
      selection,
    ])
  );
  const patches = instanceIds.flatMap((instanceId) => {
    const patch = createStyleSourceSelectionAddPatch({
      styleSourceSelection: selectionByInstanceId.get(instanceId),
      styleSources,
      instanceId,
      styleSourceId,
      position,
    });
    return patch === undefined ? [] : [patch];
  });
  return createStyleSourceSelectionPayload(patches);
};

export const createStyleSourceSelectionDetachPayload = ({
  instanceIds,
  styleSourceSelections,
  styleSourceId,
}: {
  instanceIds: Instance["id"][];
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styleSourceId: StyleSource["id"];
}) => {
  const selectionByInstanceId = new Map(
    Array.from(styleSourceSelections, (selection) => [
      selection.instanceId,
      selection,
    ])
  );
  const patches = instanceIds.flatMap((instanceId) => {
    const patch = createStyleSourceSelectionRemovePatch({
      styleSourceSelection: selectionByInstanceId.get(instanceId),
      instanceId,
      styleSourceId,
    });
    return patch === undefined ? [] : [patch];
  });
  return createStyleSourceSelectionPayload(patches);
};

type LocalStyleSourcePlan =
  | {
      styleSourceId: StyleSource["id"];
      styleSource?: undefined;
      selection?: undefined;
      selectionValueIndex?: undefined;
    }
  | {
      styleSourceId: StyleSource["id"];
      styleSource: StyleSource;
      selection: StyleSourceSelection;
      selectionValueIndex?: undefined;
    }
  | {
      styleSourceId: StyleSource["id"];
      styleSource: StyleSource;
      selection?: undefined;
      selectionValueIndex: number;
    };

export const createLocalStyleSourcePlan = ({
  styleSourceSelection,
  styleSources,
  instanceId,
  createId = nanoid,
}: {
  styleSourceSelection: StyleSourceSelection | undefined;
  styleSources: Pick<StyleSources, "get">;
  instanceId: Instance["id"];
  createId?: () => StyleSource["id"];
}): LocalStyleSourcePlan => {
  const localStyleSourceId = getLocalStyleSourceId({
    styleSources,
    styleSourceSelection,
  });
  if (localStyleSourceId !== undefined) {
    return { styleSourceId: localStyleSourceId };
  }

  const styleSourceId = createId();
  const styleSource: StyleSource = { type: "local", id: styleSourceId };
  if (styleSourceSelection === undefined) {
    return {
      styleSourceId,
      styleSource,
      selection: { instanceId, values: [styleSourceId] },
    };
  }

  return {
    styleSourceId,
    styleSource,
    selectionValueIndex: styleSourceSelection.values.length,
  };
};

export const getLocalStyleSourceIdWithCreated = ({
  createdLocalSourceIds,
  instanceId,
  styleSources,
  styleSourceSelection,
}: {
  createdLocalSourceIds: Map<Instance["id"], StyleSource["id"]>;
  instanceId: Instance["id"];
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelection: StyleSourceSelection | undefined;
}) => {
  const created = createdLocalSourceIds.get(instanceId);
  if (created !== undefined) {
    return created;
  }
  return getLocalStyleSourceId({ styleSources, styleSourceSelection });
};

export const createLocalStyleSourcePatchPlan = ({
  createdLocalSourceIds,
  instanceId,
  styleSources,
  styleSourceSelection,
  shouldCreate,
  createId = nanoid,
}: {
  createdLocalSourceIds: Map<Instance["id"], StyleSource["id"]>;
  instanceId: Instance["id"];
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelection: StyleSourceSelection | undefined;
  shouldCreate: boolean;
  createId?: () => StyleSource["id"];
}) => {
  const existingStyleSourceId = getLocalStyleSourceIdWithCreated({
    createdLocalSourceIds,
    instanceId,
    styleSources,
    styleSourceSelection,
  });
  if (existingStyleSourceId !== undefined) {
    return { styleSourceId: existingStyleSourceId, payload: [] };
  }
  if (shouldCreate === false) {
    return;
  }
  const plan = createLocalStyleSourcePlan({
    styleSourceSelection,
    styleSources,
    instanceId,
    createId,
  });
  const { styleSourceId } = plan;
  createdLocalSourceIds.set(instanceId, styleSourceId);
  if (plan.styleSource === undefined) {
    return { styleSourceId, payload: [] };
  }
  const selectionPatch =
    plan.selection !== undefined
      ? {
          op: "add" as const,
          path: [instanceId],
          value: plan.selection,
        }
      : {
          op: "add" as const,
          path: [instanceId, "values", plan.selectionValueIndex],
          value: styleSourceId,
        };
  return {
    styleSourceId,
    payload: [
      {
        namespace: "styleSources" as const,
        patches: [
          {
            op: "add" as const,
            path: [styleSourceId],
            value: plan.styleSource,
          },
        ],
      },
      {
        namespace: "styleSourceSelections" as const,
        patches: [selectionPatch],
      },
    ],
  };
};

export const getOrCreateLocalStyleSourceIdMutable = ({
  styleSourceSelections,
  styleSources,
  instanceId,
  createId = nanoid,
}: {
  styleSourceSelections: StyleSourceSelections;
  styleSources: StyleSources;
  instanceId: Instance["id"];
  createId?: () => StyleSource["id"];
}) => {
  const styleSourceSelection = styleSourceSelections.get(instanceId);
  const plan = createLocalStyleSourcePlan({
    styleSources,
    styleSourceSelection,
    instanceId,
    createId,
  });
  if (plan.styleSource !== undefined) {
    styleSources.set(plan.styleSourceId, plan.styleSource);
  }
  if (plan.selection !== undefined) {
    styleSourceSelections.set(instanceId, plan.selection);
  } else if (plan.selectionValueIndex !== undefined) {
    styleSourceSelection?.values.splice(
      plan.selectionValueIndex,
      0,
      plan.styleSourceId
    );
  }
  return plan.styleSourceId;
};

export const createStyleDecl = ({
  styleSourceId,
  breakpointId,
  property,
  value,
  state,
  listed,
}: {
  styleSourceId: StyleDecl["styleSourceId"];
  breakpointId: StyleDecl["breakpointId"];
  property: unknown;
  value: unknown;
  state?: StyleDecl["state"];
  listed?: StyleDecl["listed"];
}) =>
  styleDeclSchema.parse({
    styleSourceId,
    breakpointId,
    state,
    property: normalizeStyleProperty(property),
    value,
    listed,
  });

export const createStyleDeclFromInput = ({
  styleSourceId,
  property,
  value,
  breakpoint = DEFAULT_BREAKPOINT_ID,
  state,
  listed,
}: {
  styleSourceId: StyleSource["id"];
  property: unknown;
  value: unknown;
  breakpoint?: string;
  state?: StyleDecl["state"];
  listed?: StyleDecl["listed"];
}): StyleDecl =>
  createStyleDecl({
    styleSourceId,
    breakpointId: breakpoint,
    state,
    property,
    value,
    listed,
  });

export const getStyleDeclKeyFromInput = ({
  styleSourceId,
  property,
  breakpoint = DEFAULT_BREAKPOINT_ID,
  state,
}: {
  styleSourceId: StyleSource["id"];
  property: unknown;
  breakpoint?: string;
  state?: StyleDecl["state"];
}) =>
  getStyleDeclKey({
    styleSourceId,
    breakpointId: breakpoint,
    state,
    property: normalizeStyleProperty(property),
  });

export const updateStyleDecl = (
  declaration: StyleDecl,
  values: Partial<Omit<StyleDecl, "property" | "value">> & {
    property?: unknown;
    value?: unknown;
  }
) =>
  styleDeclSchema.parse({
    ...declaration,
    ...values,
    property:
      values.property === undefined
        ? declaration.property
        : normalizeStyleProperty(values.property),
  });

export const setStyleDeclMutable = ({
  styles,
  styleSourceId,
  breakpointId,
  property,
  value,
  state,
  listed,
}: {
  styles: Styles;
  styleSourceId: StyleDecl["styleSourceId"];
  breakpointId: StyleDecl["breakpointId"];
  property: unknown;
  value: unknown;
  state?: StyleDecl["state"];
  listed?: StyleDecl["listed"];
}) => {
  const styleDecl = createStyleDecl({
    styleSourceId,
    breakpointId,
    property,
    value,
    state,
    listed,
  });
  const styleKey = getStyleDeclKey(styleDecl);
  styles.set(styleKey, styleDecl);
  return { styleDecl, styleKey };
};

export const deleteStyleDeclMutable = ({
  styles,
  styleSourceId,
  breakpointId,
  property,
  state,
}: {
  styles: Styles;
  styleSourceId: StyleDecl["styleSourceId"];
  breakpointId: StyleDecl["breakpointId"];
  property: unknown;
  state?: StyleDecl["state"];
}) => {
  const styleKey = getStyleDeclKey({
    styleSourceId,
    breakpointId,
    state,
    property: normalizeStyleProperty(property),
  });
  return styles.delete(styleKey);
};

export const deleteStyleSourceMutable = ({
  styleSourceId,
  styleSources,
  styleSourceSelections,
  styles,
}: {
  styleSourceId: StyleSource["id"];
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  styles: Styles;
}): void => {
  styleSources.delete(styleSourceId);
  for (const styleSourceSelection of styleSourceSelections.values()) {
    const index = styleSourceSelection.values.indexOf(styleSourceId);
    if (index !== -1) {
      styleSourceSelection.values.splice(index, 1);
    }
  }
  for (const [styleDeclKey, styleDecl] of styles) {
    if (styleDecl.styleSourceId === styleSourceId) {
      styles.delete(styleDeclKey);
    }
  }
};

export const findUnusedTokens = ({
  styleSources,
  styleSourceUsages,
}: {
  styleSources: StyleSources;
  styleSourceUsages: Map<StyleSource["id"], Set<Instance["id"]>>;
}): StyleSource["id"][] => {
  const unusedTokenIds: StyleSource["id"][] = [];
  for (const styleSource of styleSources.values()) {
    if (styleSource.type === "token") {
      const usages = styleSourceUsages.get(styleSource.id);
      if (usages === undefined || usages.size === 0) {
        unusedTokenIds.push(styleSource.id);
      }
    }
  }
  return unusedTokenIds;
};

export const deleteStyleSourcesMutable = ({
  styleSourceIds,
  styleSources,
  styleSourceSelections,
  styles,
}: {
  styleSourceIds: StyleSource["id"][];
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  styles: Styles;
}): void => {
  for (const styleSourceId of styleSourceIds) {
    deleteStyleSourceMutable({
      styleSourceId,
      styleSources,
      styleSourceSelections,
      styles,
    });
  }
};

export const validateAndRenameStyleSource = ({
  id,
  name,
  styleSources,
}: {
  id: StyleSource["id"];
  name: string;
  styleSources: StyleSources;
}): RenameStyleSourceError | undefined => {
  const error = validateStyleSourceName({ id, name, styleSources });
  if (error !== undefined) {
    return error;
  }
};

export const renameStyleSourceMutable = ({
  id,
  name,
  styleSources,
}: {
  id: StyleSource["id"];
  name: string;
  styleSources: StyleSources;
}): void => {
  const styleSource = styleSources.get(id);
  if (styleSource?.type === "token") {
    styleSource.name = name;
  }
};

export const toggleStyleSourceLockMutable = ({
  id,
  locked,
  styleSources,
}: {
  id: StyleSource["id"];
  locked: boolean;
  styleSources: StyleSources;
}): void => {
  const styleSource = styleSources.get(id);
  if (styleSource?.type !== "token") {
    return;
  }
  if (locked) {
    styleSource.locked = true;
    return;
  }
  delete styleSource.locked;
};

export const deleteLocalStyleSourcesMutable = ({
  localStyleSourceIds,
  styleSources,
  styles,
}: {
  localStyleSourceIds: Set<StyleSource["id"]>;
  styleSources: StyleSources;
  styles: Styles;
}): void => {
  for (const styleSourceId of localStyleSourceIds) {
    styleSources.delete(styleSourceId);
  }
  for (const [styleDeclKey, styleDecl] of styles) {
    if (localStyleSourceIds.has(styleDecl.styleSourceId)) {
      styles.delete(styleDeclKey);
    }
  }
};

export const findDuplicateTokens = ({
  styleSources,
  styles,
  breakpoints,
}: {
  styleSources: StyleSources;
  styles: Styles;
  breakpoints: Map<Breakpoint["id"], Breakpoint>;
}): Map<StyleSource["id"], StyleSource["id"][]> => {
  const duplicatesMap = new Map<StyleSource["id"], StyleSource["id"][]>();
  const stylesArray = Array.from(styles.values());
  const tokens = Array.from(styleSources.values()).filter(
    (source): source is Extract<StyleSource, { type: "token" }> =>
      source.type === "token"
  );
  const signatureToTokenIds = new Map<string, StyleSource["id"][]>();
  const nameToTokenIds = new Map<string, StyleSource["id"][]>();

  for (const token of tokens) {
    const signature = getStyleSourceStylesSignature(
      token.id,
      stylesArray,
      breakpoints,
      new Map()
    );
    const tokensWithSignature = signatureToTokenIds.get(signature) ?? [];
    tokensWithSignature.push(token.id);
    signatureToTokenIds.set(signature, tokensWithSignature);

    const tokensWithName = nameToTokenIds.get(token.name) ?? [];
    tokensWithName.push(token.id);
    nameToTokenIds.set(token.name, tokensWithName);
  }

  const addDuplicates = (tokenIds: StyleSource["id"][]) => {
    if (tokenIds.length <= 1) {
      return;
    }
    for (const tokenId of tokenIds) {
      const duplicates = duplicatesMap.get(tokenId) ?? [];
      for (const duplicate of tokenIds) {
        if (duplicate !== tokenId && duplicates.includes(duplicate) === false) {
          duplicates.push(duplicate);
        }
      }
      duplicatesMap.set(tokenId, duplicates);
    }
  };

  for (const tokenIds of signatureToTokenIds.values()) {
    addDuplicates(tokenIds);
  }
  for (const tokenIds of nameToTokenIds.values()) {
    addDuplicates(tokenIds);
  }

  return duplicatesMap;
};

const createStyleRemovePayload = (styleKeys: string[]) =>
  styleKeys.length === 0
    ? []
    : [
        {
          namespace: "styles" as const,
          patches: styleKeys.map((key) => ({
            op: "remove" as const,
            path: [key],
          })),
        },
      ];

export const createDesignTokenCreatePayload = ({
  tokens,
  styleSources,
  createId,
}: {
  tokens: Array<z.infer<typeof designTokenCreateInput>>;
  styleSources: StyleSources;
  createId: () => StyleSource["id"];
}) => {
  const styleSourcePatches = [];
  const stylePatches = [];
  const tokenIds = [];
  const errors: Array<
    | { type: "duplicate-id"; tokenId: StyleSource["id"] }
    | {
        type: "invalid-name";
        tokenId: StyleSource["id"];
        error: ReturnType<typeof validateStyleSourceName>;
      }
  > = [];

  for (const token of tokens) {
    const tokenId = token.tokenId ?? createId();
    if (styleSources.has(tokenId)) {
      errors.push({ type: "duplicate-id", tokenId });
      continue;
    }
    const nameError = validateStyleSourceName({
      id: tokenId,
      name: token.name,
      styleSources,
    });
    if (nameError !== undefined) {
      errors.push({ type: "invalid-name", tokenId, error: nameError });
      continue;
    }
    tokenIds.push(tokenId);
    const styleSource = createTokenStyleSource({
      id: tokenId,
      name: token.name,
    });
    styleSources.set(tokenId, styleSource);
    styleSourcePatches.push({
      op: "add" as const,
      path: [tokenId],
      value: styleSource,
    });
    for (const declaration of createDesignTokenStyleInputs(token)) {
      const style = createStyleDeclFromInput({
        styleSourceId: tokenId,
        breakpoint: declaration.breakpoint,
        property: declaration.property,
        value: declaration.value,
        state: declaration.state,
      });
      stylePatches.push({
        op: "add" as const,
        path: [getStyleDeclKey(style)],
        value: style,
      });
    }
  }

  return {
    payload: [
      ...(styleSourcePatches.length === 0
        ? []
        : [
            {
              namespace: "styleSources" as const,
              patches: styleSourcePatches,
            },
          ]),
      ...(stylePatches.length === 0
        ? []
        : [{ namespace: "styles" as const, patches: stylePatches }]),
    ],
    tokenIds,
    errors,
  };
};

export const createDesignTokenStyleUpdatePayload = ({
  designTokenId,
  updates,
  styles,
}: {
  designTokenId: StyleSource["id"];
  updates: Array<z.infer<typeof designTokenStyleInput>>;
  styles: Iterable<StyleDecl>;
}) => {
  const styleKeys = new Set(
    Array.from(styles, (styleDecl) => getStyleDeclKey(styleDecl))
  );
  const patches = updates.map((update) => {
    const style = createStyleDeclFromInput({
      styleSourceId: designTokenId,
      breakpoint: update.breakpoint,
      property: update.property,
      value: update.value,
      state: update.state,
    });
    const key = getStyleDeclKey(style);
    const patch = {
      op: styleKeys.has(key) ? ("replace" as const) : ("add" as const),
      path: [key],
      value: style,
    };
    styleKeys.add(key);
    return patch;
  });

  return {
    payload:
      patches.length === 0 ? [] : [{ namespace: "styles" as const, patches }],
    styleKeys: patches.map((patch) => String(patch.path[0])),
  };
};

export const createDesignTokenStyleDeletePayload = ({
  designTokenId,
  deletions,
  styles,
}: {
  designTokenId: StyleSource["id"];
  deletions: Array<Omit<z.infer<typeof styleDeleteInput>, "instanceId">>;
  styles: Iterable<StyleDecl>;
}) => {
  const existingStyleKeys = new Set(
    Array.from(styles, (styleDecl) => getStyleDeclKey(styleDecl))
  );
  const styleKeys = deletions.flatMap((deletion) => {
    const key = getStyleDeclKeyFromInput({
      styleSourceId: designTokenId,
      breakpoint: deletion.breakpoint,
      state: deletion.state,
      property: deletion.property,
    });
    return existingStyleKeys.has(key) ? [key] : [];
  });

  return {
    payload: createStyleRemovePayload(styleKeys),
    styleKeys,
  };
};

export const createDesignTokenExtractionPayload = ({
  tokenId,
  tokenName,
  instanceIds,
  styleSources,
  styleSourceSelections,
  styles,
  removeLocalProps,
}: {
  tokenId: StyleSource["id"];
  tokenName: string;
  instanceIds: Instance["id"][];
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styles: Iterable<StyleDecl>;
  removeLocalProps?: string[];
}) => {
  const selectionByInstanceId = new Map(
    Array.from(styleSourceSelections, (selection) => [
      selection.instanceId,
      selection,
    ])
  );
  const selectedLocalSourceIds = new Set<StyleSource["id"]>();
  for (const instanceId of instanceIds) {
    const styleSourceId = getLocalStyleSourceIdWithCreated({
      createdLocalSourceIds: new Map(),
      instanceId,
      styleSources,
      styleSourceSelection: selectionByInstanceId.get(instanceId),
    });
    if (styleSourceId !== undefined) {
      selectedLocalSourceIds.add(styleSourceId);
    }
  }
  const properties =
    removeLocalProps === undefined ? undefined : new Set(removeLocalProps);
  const tokenStylePatches = [];
  const localStyleRemovePatches = [];
  const coveredKeys = new Set<string>();
  for (const declaration of styles) {
    if (
      selectedLocalSourceIds.has(declaration.styleSourceId) === false ||
      (properties !== undefined &&
        properties.has(declaration.property) === false)
    ) {
      continue;
    }
    const tokenDeclaration = updateStyleDecl(declaration, {
      styleSourceId: tokenId,
    });
    const tokenKey = getStyleDeclKey(tokenDeclaration);
    if (coveredKeys.has(tokenKey) === false) {
      coveredKeys.add(tokenKey);
      tokenStylePatches.push({
        op: "add" as const,
        path: [tokenKey],
        value: tokenDeclaration,
      });
    }
    if (properties !== undefined) {
      localStyleRemovePatches.push({
        op: "remove" as const,
        path: [getStyleDeclKey(declaration)],
      });
    }
  }
  const selectionPatches = instanceIds.flatMap((instanceId) => {
    const patch = createStyleSourceSelectionAddPatch({
      styleSourceSelection: selectionByInstanceId.get(instanceId),
      styleSources,
      instanceId,
      styleSourceId: tokenId,
    });
    return patch === undefined ? [] : [patch];
  });

  return {
    payload: [
      {
        namespace: "styleSources" as const,
        patches: [
          {
            op: "add" as const,
            path: [tokenId],
            value: createTokenStyleSource({ id: tokenId, name: tokenName }),
          },
        ],
      },
      ...(tokenStylePatches.length === 0 && localStyleRemovePatches.length === 0
        ? []
        : [
            {
              namespace: "styles" as const,
              patches: [...tokenStylePatches, ...localStyleRemovePatches],
            },
          ]),
      ...(selectionPatches.length === 0
        ? []
        : [
            {
              namespace: "styleSourceSelections" as const,
              patches: selectionPatches,
            },
          ]),
    ],
    styleKeys: tokenStylePatches.map((patch) => String(patch.path[0])),
  };
};

export const createStyleDeclarationUpdatePayload = ({
  updates,
  styleSources,
  styleSourceSelections,
  styles,
  createdLocalSourceIds = new Map(),
  createId,
}: {
  updates: Array<z.infer<typeof styleUpdateInput>>;
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styles: Iterable<StyleDecl>;
  createdLocalSourceIds?: Map<Instance["id"], StyleSource["id"]>;
  createId: () => StyleSource["id"];
}) => {
  const payload = [];
  const stylePatches = [];
  const styleKeys = new Set(
    Array.from(styles, (styleDecl) => getStyleDeclKey(styleDecl))
  );
  const styleSourceSelectionByInstanceId = new Map(
    Array.from(styleSourceSelections, (selection) => [
      selection.instanceId,
      selection,
    ])
  );
  const missingLocalStyleSourceInstanceIds = [];

  for (const update of updates) {
    const result = createLocalStyleSourcePatchPlan({
      createdLocalSourceIds,
      instanceId: update.instanceId,
      styleSources,
      styleSourceSelection: styleSourceSelectionByInstanceId.get(
        update.instanceId
      ),
      shouldCreate: update.createLocalIfMissing ?? true,
      createId,
    });
    if (result === undefined) {
      missingLocalStyleSourceInstanceIds.push(update.instanceId);
      continue;
    }
    payload.push(...result.payload);
    const nextStyleDecl = createStyleDeclFromInput({
      styleSourceId: result.styleSourceId,
      breakpoint: update.breakpoint,
      property: update.property,
      value: update.value,
      state: update.state,
      listed: update.listed,
    });
    const key = getStyleDeclKey(nextStyleDecl);
    stylePatches.push({
      op: styleKeys.has(key) ? ("replace" as const) : ("add" as const),
      path: [key],
      value: nextStyleDecl,
    });
    styleKeys.add(key);
  }

  if (stylePatches.length > 0) {
    payload.push({ namespace: "styles" as const, patches: stylePatches });
  }

  return {
    payload,
    styleKeys: stylePatches.map((patch) => String(patch.path[0])),
    missingLocalStyleSourceInstanceIds,
  };
};

export const createStyleDeclarationDeletePayload = ({
  deletions,
  styleSources,
  styleSourceSelections,
  styles,
}: {
  deletions: Array<z.infer<typeof styleDeleteInput>>;
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styles: Iterable<StyleDecl>;
}) => {
  const styleKeys = new Set<string>();
  const styleSourceSelectionByInstanceId = new Map(
    Array.from(styleSourceSelections, (selection) => [
      selection.instanceId,
      selection,
    ])
  );
  const existingStyleKeys = new Set(
    Array.from(styles, (styleDecl) => getStyleDeclKey(styleDecl))
  );

  for (const deletion of deletions) {
    const styleSourceId = getLocalStyleSourceIdWithCreated({
      createdLocalSourceIds: new Map(),
      instanceId: deletion.instanceId,
      styleSources,
      styleSourceSelection: styleSourceSelectionByInstanceId.get(
        deletion.instanceId
      ),
    });
    if (styleSourceId === undefined) {
      continue;
    }
    const key = getStyleDeclKeyFromInput({
      styleSourceId,
      breakpoint: deletion.breakpoint,
      state: deletion.state,
      property: deletion.property,
    });
    if (existingStyleKeys.has(key)) {
      styleKeys.add(key);
    }
  }

  const removedStyleKeys = Array.from(styleKeys);
  return {
    payload: createStyleRemovePayload(removedStyleKeys),
    styleKeys: removedStyleKeys,
  };
};

export const createSelectedStyleDeclarationUpdatePayload = ({
  updates,
  styleSources,
  styleSourceSelections,
  styles,
}: {
  updates: Array<
    Omit<z.infer<typeof styleUpdateInput>, "createLocalIfMissing"> & {
      styleSource: StyleSource;
      styleSourceId: StyleSource["id"];
    }
  >;
  styleSources: Pick<StyleSources, "get">;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  styles: Iterable<StyleDecl>;
}) => {
  const payload: BuilderPatchChange[] = [];
  const styleSourcePatches: BuilderPatchChange["patches"] = [];
  const styleSelectionPatches: BuilderPatchChange["patches"] = [];
  const stylePatches: BuilderPatchChange["patches"] = [];
  const existingStyleKeys = new Set(
    Array.from(styles, (styleDecl) => getStyleDeclKey(styleDecl))
  );
  const nextStyleSourceIds = new Set<string>();
  const styleSourceSelectionByInstanceId = new Map(
    Array.from(styleSourceSelections, (selection) => [
      selection.instanceId,
      selection,
    ])
  );
  const nextSelectionValuesByInstanceId = new Map(
    Array.from(styleSourceSelectionByInstanceId, ([instanceId, selection]) => [
      instanceId,
      [...selection.values],
    ])
  );

  for (const update of updates) {
    if (nextStyleSourceIds.has(update.styleSource.id) === false) {
      const styleSourceExists =
        styleSources.get(update.styleSource.id) !== undefined;
      styleSourcePatches.push({
        op: styleSourceExists ? ("replace" as const) : ("add" as const),
        path: [update.styleSource.id],
        value: update.styleSource,
      });
      nextStyleSourceIds.add(update.styleSource.id);
    }

    const selection = styleSourceSelectionByInstanceId.get(update.instanceId);
    const hasPendingSelection =
      selection === undefined &&
      nextSelectionValuesByInstanceId.has(update.instanceId);
    const selectionValues =
      nextSelectionValuesByInstanceId.get(update.instanceId) ?? [];
    if (selectionValues.includes(update.styleSourceId) === false) {
      styleSelectionPatches.push(
        selection === undefined && hasPendingSelection === false
          ? {
              op: "add" as const,
              path: [update.instanceId],
              value: {
                instanceId: update.instanceId,
                values: [update.styleSourceId],
              },
            }
          : {
              op: "add" as const,
              path: [update.instanceId, "values", selectionValues.length],
              value: update.styleSourceId,
            }
      );
      nextSelectionValuesByInstanceId.set(update.instanceId, [
        ...selectionValues,
        update.styleSourceId,
      ]);
    }

    const styleDecl = createStyleDeclFromInput({
      styleSourceId: update.styleSourceId,
      breakpoint: update.breakpoint,
      property: update.property,
      value: update.value,
      state: update.state,
      listed: update.listed,
    });
    const styleKey = getStyleDeclKey(styleDecl);
    stylePatches.push({
      op: existingStyleKeys.has(styleKey)
        ? ("replace" as const)
        : ("add" as const),
      path: [styleKey],
      value: styleDecl,
    });
    existingStyleKeys.add(styleKey);
  }

  if (styleSourcePatches.length > 0) {
    payload.push({
      namespace: "styleSources" as const,
      patches: styleSourcePatches,
    });
  }
  if (styleSelectionPatches.length > 0) {
    payload.push({
      namespace: "styleSourceSelections" as const,
      patches: styleSelectionPatches,
    });
  }
  if (stylePatches.length > 0) {
    payload.push({ namespace: "styles" as const, patches: stylePatches });
  }

  return {
    payload,
    styleKeys: stylePatches.map((patch) => String(patch.path[0])),
  };
};

export const createSelectedStyleDeclarationDeletePayload = ({
  deletions,
  styles,
}: {
  deletions: Array<
    Omit<z.infer<typeof styleDeleteInput>, "instanceId"> & {
      styleSourceId: StyleSource["id"];
    }
  >;
  styles: Iterable<StyleDecl>;
}) => {
  const existingStyleKeys = new Set(
    Array.from(styles, (styleDecl) => getStyleDeclKey(styleDecl))
  );
  const styleKeys = deletions.flatMap((deletion) => {
    const styleKey = getStyleDeclKeyFromInput({
      styleSourceId: deletion.styleSourceId,
      breakpoint: deletion.breakpoint,
      state: deletion.state,
      property: deletion.property,
    });
    return existingStyleKeys.has(styleKey) ? [styleKey] : [];
  });
  return {
    payload: createStyleRemovePayload(styleKeys),
    styleKeys,
  };
};

export const createStyleValueReplacementPayload = ({
  styles,
  styleSources,
  styleSourceSelections,
  instanceIds,
  property,
  fromValue,
  toValue,
}: {
  styles: Iterable<StyleDecl>;
  styleSources: Iterable<StyleSource>;
  styleSourceSelections: Iterable<StyleSourceSelection>;
  instanceIds?: Set<Instance["id"]>;
  property: string;
  fromValue: unknown;
  toValue: unknown;
}) => {
  const normalizedProperty = normalizeStyleProperty(property);
  const styleSourceById = new Map(
    Array.from(styleSources, (styleSource) => [styleSource.id, styleSource])
  );
  const selectedLocalSources = new Set(
    Array.from(styleSourceSelections)
      .filter(
        (selection) =>
          instanceIds === undefined || instanceIds.has(selection.instanceId)
      )
      .flatMap((selection) => selection.values)
      .filter(
        (styleSourceId) => styleSourceById.get(styleSourceId)?.type === "local"
      )
  );
  const patches = Array.from(styles).flatMap((declaration) => {
    if (
      declaration.property !== normalizedProperty ||
      selectedLocalSources.has(declaration.styleSourceId) === false ||
      deepEqual(declaration.value, fromValue) === false
    ) {
      return [];
    }
    const nextStyleDecl = updateStyleDecl(declaration, { value: toValue });
    return [
      {
        op: "replace" as const,
        path: [getStyleDeclKey(declaration)],
        value: nextStyleDecl,
      },
    ];
  });

  return {
    payload:
      patches.length === 0 ? [] : [{ namespace: "styles" as const, patches }],
    styleKeys: patches.map((patch) => String(patch.path[0])),
  };
};

const getRequiredStyleMutationState = (
  state: Pick<
    BuilderState,
    "instances" | "styles" | "styleSources" | "styleSourceSelections"
  >
) => {
  const styleState = getRequiredStyleState(state);
  if (state.instances === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Instances namespace is missing"
    );
  }
  return { ...styleState, instances: state.instances };
};

const assertStyleInstances = (
  instances: Map<Instance["id"], Instance>,
  instanceIds: Iterable<Instance["id"]>
) => {
  for (const instanceId of instanceIds) {
    if (instances.has(instanceId) === false) {
      return throwBuilderRuntimeError("NOT_FOUND", "Instance not found");
    }
  }
};

export const updateStyleDeclarations = (
  state: Pick<
    BuilderState,
    | "breakpoints"
    | "instances"
    | "styles"
    | "styleSources"
    | "styleSourceSelections"
  >,
  input: z.infer<typeof styleUpdateDeclarationsInput>,
  context: { createId: () => string }
) => {
  const styleState = getRequiredStyleMutationState(state);
  assertStyleInstances(
    styleState.instances,
    input.updates.map((update) => update.instanceId)
  );
  const { payload, styleKeys, missingLocalStyleSourceInstanceIds } =
    createStyleDeclarationUpdatePayload({
      updates: input.updates.map((update) =>
        withDefaultBreakpoint(update, getBaseBreakpointId(state.breakpoints))
      ),
      styleSources: styleState.styleSources,
      styleSourceSelections: styleState.styleSourceSelections.values(),
      styles: styleState.styles.values(),
      createId: context.createId,
    });
  if (missingLocalStyleSourceInstanceIds.length > 0) {
    return throwBuilderRuntimeError(
      "NOT_FOUND",
      "Local style source not found for instance"
    );
  }
  return createRuntimeMutation({
    payload,
    result: { styleKeys },
    invalidatesNamespaces: ["styles", "styleSources", "styleSourceSelections"],
  });
};

export const deleteStyleDeclarations = (
  state: Pick<
    BuilderState,
    | "breakpoints"
    | "instances"
    | "styles"
    | "styleSources"
    | "styleSourceSelections"
  >,
  input: z.infer<typeof styleDeleteDeclarationsInput>
) => {
  const styleState = getRequiredStyleMutationState(state);
  assertStyleInstances(
    styleState.instances,
    input.deletions.map((deletion) => deletion.instanceId)
  );
  const { payload, styleKeys } = createStyleDeclarationDeletePayload({
    deletions: input.deletions.map((deletion) =>
      withDefaultBreakpoint(deletion, getBaseBreakpointId(state.breakpoints))
    ),
    styleSources: styleState.styleSources,
    styleSourceSelections: styleState.styleSourceSelections.values(),
    styles: styleState.styles.values(),
  });
  return createRuntimeMutation({
    payload,
    result: { styleKeys },
    invalidatesNamespaces: ["styles"],
  });
};

export const replaceStyleValues = (
  state: Pick<
    BuilderState,
    "pages" | "instances" | "styles" | "styleSources" | "styleSourceSelections"
  >,
  input: z.infer<typeof styleReplaceInput>
) => {
  const styleState = getRequiredStyleMutationState(state);
  const hasPageFilter =
    input.pageId !== undefined || input.pagePath !== undefined;
  const pages = hasPageFilter ? getSerializedPages(state) : undefined;
  const page =
    pages === undefined ? undefined : findSerializedPageByInput(pages, input);
  if (hasPageFilter && page === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  const pageInstanceIds =
    page === undefined
      ? undefined
      : new Set(
          getInstanceDepths(styleState.instances, [page.rootInstanceId]).keys()
        );
  const { payload, styleKeys } = createStyleValueReplacementPayload({
    styles: styleState.styles.values(),
    styleSources: styleState.styleSources.values(),
    styleSourceSelections: styleState.styleSourceSelections.values(),
    instanceIds: pageInstanceIds,
    property: input.property,
    fromValue: input.fromValue,
    toValue: input.toValue,
  });
  return createRuntimeMutation({
    payload,
    result: { styleKeys },
    invalidatesNamespaces: ["styles"],
  });
};

const compileOptionalRegex = (pattern: string | undefined) => {
  if (pattern === undefined) {
    return;
  }
  try {
    return new RegExp(pattern);
  } catch {
    return throwBuilderRuntimeError("BAD_REQUEST", "Invalid scope regex");
  }
};

const assertCssVariableName = (name: string) => {
  const error = validateCssVariableNameWithStyles({ name, styles: [] });
  if (error !== undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", error.message);
  }
};

export const listCssVariables = (
  state: Pick<
    BuilderState,
    "styles" | "props" | "styleSources" | "styleSourceSelections"
  >,
  input: {
    filter?: string;
    withUsage?: boolean;
  } = {}
) => {
  if (state.props === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Props namespace is missing"
    );
  }
  const styleState = getRequiredStyleState(state);
  return serializeCssVariables({
    styles: styleState.styles.values(),
    props: state.props.values(),
    styleSourceSelections: styleState.styleSourceSelections.values(),
    filter: input.filter,
    withUsage: input.withUsage,
  });
};

export const defineCssVariables = (
  state: Pick<
    BuilderState,
    | "breakpoints"
    | "pages"
    | "styles"
    | "styleSources"
    | "styleSourceSelections"
  >,
  input: z.infer<typeof cssVariableDefineInput>,
  context: { createId: () => string }
) => {
  const rootInstanceId =
    state.pages === undefined
      ? undefined
      : getHomePageRootInstanceId(state.pages);
  if (rootInstanceId === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Home page not found");
  }
  for (const [property] of Object.entries(input.vars)) {
    assertCssVariableName(property);
  }
  const styleState = getRequiredStyleState(state);
  const resultPayload = createCssVariableRootDefinePayload({
    rootInstanceId,
    vars: input.vars,
    styleSources: styleState.styleSources,
    styleSourceSelections: styleState.styleSourceSelections.values(),
    styles: styleState.styles.values(),
    overwrite: input.overwrite,
    breakpointId: getBaseBreakpointId(state.breakpoints),
    createId: context.createId,
  });
  if (resultPayload.missingRootStyleSource) {
    return throwBuilderRuntimeError(
      "NOT_FOUND",
      "Local style source not found for instance"
    );
  }
  const conflict = resultPayload.conflicts.at(0);
  if (conflict !== undefined) {
    return throwBuilderRuntimeError(
      "CONFLICT",
      `CSS variable "${conflict}" already exists`
    );
  }
  return createRuntimeMutation({
    payload: resultPayload.payload,
    result: { names: Object.keys(input.vars) },
    invalidatesNamespaces: ["styles", "styleSources", "styleSourceSelections"],
  });
};

export const deleteCssVariables = (
  state: Pick<
    BuilderState,
    "styles" | "props" | "styleSources" | "styleSourceSelections"
  >,
  input: z.infer<typeof cssVariableDeleteInput>
) => {
  for (const name of input.names) {
    assertCssVariableName(name);
  }
  if (state.props === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Props namespace is missing"
    );
  }
  const styleState = getRequiredStyleState(state);
  const { payload, styleKeys, referenced } = createCssVariableDeletePayload({
    names: input.names,
    styles: styleState.styles.values(),
    props: state.props.values(),
    force: input.force,
  });
  if (referenced.length > 0) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      `CSS variables are still referenced: ${referenced.join(", ")}`
    );
  }
  return createRuntimeMutation({
    payload,
    result: { names: input.names, styleKeys },
    invalidatesNamespaces: ["styles"],
  });
};

export const rewriteCssVariableRefs = (
  state: Pick<
    BuilderState,
    "styles" | "props" | "styleSources" | "styleSourceSelections"
  >,
  input: z.infer<typeof cssVariableRewriteRefsInput>
) => {
  for (const [fromName, toName] of Object.entries(input.map)) {
    assertCssVariableName(fromName);
    assertCssVariableName(toName);
  }
  if (state.props === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Props namespace is missing"
    );
  }
  const styleState = getRequiredStyleState(state);
  const { payload, styleKeys, propIds } =
    createCssVariableReferenceRewritePayload({
      replacements: input.map,
      scopeRegex: compileOptionalRegex(input.scopeRegex),
      styles: styleState.styles.values(),
      props: state.props.values(),
      styleSourceSelections: styleState.styleSourceSelections.values(),
    });
  return createRuntimeMutation({
    payload,
    result: { styleKeys, propIds },
    invalidatesNamespaces: ["styles", "props"],
  });
};

const getDesignTokenOrThrow = (
  styleSources: Iterable<StyleSource>,
  tokenId: StyleSource["id"]
) => {
  const token = findDesignToken(styleSources, tokenId);
  if (token === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Design token not found");
  }
  return token;
};

export const createDesignTokens = (
  state: Pick<
    BuilderState,
    "breakpoints" | "styles" | "styleSources" | "styleSourceSelections"
  >,
  input: z.infer<typeof designTokenCreateManyInput>,
  context: { createId: () => string }
) => {
  const styleState = getRequiredStyleState(state);
  const { payload, tokenIds, errors } = createDesignTokenCreatePayload({
    tokens: input.tokens.map((token) => ({
      ...token,
      styles: undefined,
      declarations: createDesignTokenStyleInputs(token).map((declaration) =>
        withDefaultBreakpoint(
          declaration,
          getBaseBreakpointId(state.breakpoints)
        )
      ),
    })),
    styleSources: new Map(styleState.styleSources),
    createId: context.createId,
  });
  const error = errors.at(0);
  if (error?.type === "duplicate-id") {
    return throwBuilderRuntimeError(
      "CONFLICT",
      "Design token id already exists"
    );
  }
  if (error?.type === "invalid-name") {
    return throwBuilderRuntimeError(
      "CONFLICT",
      error.error?.type === "minlength"
        ? "Design token name is required"
        : "Design token name already exists"
    );
  }
  return createRuntimeMutation({
    payload,
    result: { tokenIds },
    invalidatesNamespaces: ["styleSources", "styles"],
  });
};

export const updateDesignTokenStyles = (
  state: Pick<
    BuilderState,
    "breakpoints" | "styles" | "styleSources" | "styleSourceSelections"
  >,
  input: z.infer<typeof designTokenStyleUpdatesInput>
) => {
  const styleState = getRequiredStyleState(state);
  getDesignTokenOrThrow(styleState.styleSources.values(), input.designTokenId);
  const { payload, styleKeys } = createDesignTokenStyleUpdatePayload({
    designTokenId: input.designTokenId,
    updates: input.updates.map((update) =>
      withDefaultBreakpoint(update, getBaseBreakpointId(state.breakpoints))
    ),
    styles: styleState.styles.values(),
  });
  return createRuntimeMutation({
    payload,
    result: { designTokenId: input.designTokenId, styleKeys },
    invalidatesNamespaces: ["styles"],
  });
};

export const deleteDesignTokenStyles = (
  state: Pick<
    BuilderState,
    "breakpoints" | "styles" | "styleSources" | "styleSourceSelections"
  >,
  input: z.infer<typeof designTokenStyleDeletionsInput>
) => {
  const styleState = getRequiredStyleState(state);
  getDesignTokenOrThrow(styleState.styleSources.values(), input.designTokenId);
  const { payload, styleKeys } = createDesignTokenStyleDeletePayload({
    designTokenId: input.designTokenId,
    deletions: input.deletions.map((deletion) =>
      withDefaultBreakpoint(deletion, getBaseBreakpointId(state.breakpoints))
    ),
    styles: styleState.styles.values(),
  });
  return createRuntimeMutation({
    payload,
    result: { designTokenId: input.designTokenId, styleKeys },
    invalidatesNamespaces: ["styles"],
  });
};

export const attachDesignToken = (
  state: Pick<
    BuilderState,
    "instances" | "styles" | "styleSources" | "styleSourceSelections"
  >,
  input: z.infer<typeof designTokenAttachInput>
) => {
  const styleState = getRequiredStyleMutationState(state);
  getDesignTokenOrThrow(styleState.styleSources.values(), input.designTokenId);
  assertStyleInstances(styleState.instances, input.instanceIds);
  const payload = createStyleSourceSelectionAttachPayload({
    instanceIds: input.instanceIds,
    styleSourceSelections: styleState.styleSourceSelections.values(),
    styleSources: styleState.styleSources,
    styleSourceId: input.designTokenId,
    position: input.position,
  });
  return createRuntimeMutation({
    payload,
    result: { designTokenId: input.designTokenId },
    invalidatesNamespaces: ["styleSourceSelections"],
  });
};

export const detachDesignToken = (
  state: Pick<
    BuilderState,
    "instances" | "styles" | "styleSources" | "styleSourceSelections"
  >,
  input: z.infer<typeof designTokenDetachInput>
) => {
  const styleState = getRequiredStyleMutationState(state);
  getDesignTokenOrThrow(styleState.styleSources.values(), input.designTokenId);
  assertStyleInstances(styleState.instances, input.instanceIds);
  const payload = createStyleSourceSelectionDetachPayload({
    instanceIds: input.instanceIds,
    styleSourceSelections: styleState.styleSourceSelections.values(),
    styleSourceId: input.designTokenId,
  });
  return createRuntimeMutation({
    payload,
    result: { designTokenId: input.designTokenId },
    invalidatesNamespaces: ["styleSourceSelections"],
  });
};

export const extractDesignToken = (
  state: Pick<
    BuilderState,
    "instances" | "styles" | "styleSources" | "styleSourceSelections"
  >,
  input: z.infer<typeof designTokenExtractInput>,
  context: { createId: () => string }
) => {
  const styleState = getRequiredStyleMutationState(state);
  assertStyleInstances(styleState.instances, input.instanceIds);
  const tokenId = context.createId();
  const { payload, styleKeys } = createDesignTokenExtractionPayload({
    tokenId,
    tokenName: input.name,
    instanceIds: input.instanceIds,
    styleSources: styleState.styleSources,
    styleSourceSelections: styleState.styleSourceSelections.values(),
    styles: styleState.styles.values(),
    removeLocalProps: input.removeLocalProps,
  });
  return createRuntimeMutation({
    payload,
    result: { designTokenId: tokenId, styleKeys },
    invalidatesNamespaces: ["styles", "styleSources", "styleSourceSelections"],
  });
};
