import type {
  Instance,
  Prop,
  Props,
  StyleDecl,
  StyleSource,
  StyleSourceSelection,
} from "@webstudio-is/sdk";
import { getStyleDeclKey } from "@webstudio-is/sdk";
import { z } from "zod";
import type { buildPatchTransaction } from "@webstudio-is/protocol";
import type { StyleValue } from "@webstudio-is/css-engine";
import { styleValue, toValue } from "@webstudio-is/css-engine";
import {
  createLocalStyleSourcePatchPlan,
  createStyleDecl,
  updateStyleDecl,
} from "./style-source-utils";
import { createPropValue } from "./prop-utils";
import {
  collectCssVariableReferences,
  createCssVariableNamesRegex,
  rewriteCssVariableReferencesInString,
  rewriteCssVariableReferencesInStyleValue,
} from "./css-variable-references";

type BuildPatchPayload = z.infer<typeof buildPatchTransaction>["payload"];

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

const toCssVariableStyleValue = (value: string | StyleValue): StyleValue =>
  typeof value === "string" ? { type: "unparsed", value } : value;

const createCssVariableDeclaration = ({
  styleSourceId,
  property,
  value,
  breakpointId = "base",
}: {
  styleSourceId: string;
  property: string;
  value: string | StyleValue;
  breakpointId?: string;
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
}: {
  vars: Record<string, string | StyleValue>;
  rootStyleSourceId: string;
  styles: Iterable<StyleDecl>;
  overwrite?: boolean;
}): {
  payload: BuildPatchPayload;
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
}: {
  rootInstanceId: Instance["id"];
  vars: Record<string, string | StyleValue>;
  styleSources: Map<StyleSource["id"], StyleSource>;
  styleSourceSelections: StyleSourceSelection[];
  styles: Iterable<StyleDecl>;
  overwrite?: boolean;
}) => {
  const rootStyleSourceResult = createLocalStyleSourcePatchPlan({
    createdLocalSourceIds: new Map(),
    instanceId: rootInstanceId,
    styleSources,
    styleSourceSelection: styleSourceSelections.find(
      (selection) => selection.instanceId === rootInstanceId
    ),
    shouldCreate: true,
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
  payload: BuildPatchPayload;
  styleKeys: string[];
  referenced: string[];
} => {
  const usageCounts = getCssVariableUsageCounts({ styles, props });
  const referenced =
    force === true
      ? []
      : names.filter((name) => (usageCounts.get(name) ?? 0) > 0);
  if (referenced.length > 0) {
    return { payload: [], styleKeys: [], referenced };
  }
  const namesSet = new Set(names);
  const styleKeys = Array.from(styles).flatMap((declaration) =>
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
}): { payload: BuildPatchPayload; styleKeys: string[]; propIds: string[] } => {
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
  const payload: BuildPatchPayload = [];
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
  props: Props,
  oldProperty: string,
  newProperty: string
): Props => {
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
  props: Props;
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
  styles: StyleDecl[];
  props: Prop[];
  styleSourceSelections: StyleSourceSelection[];
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
    vars: styles
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
