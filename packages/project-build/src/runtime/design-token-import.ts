import { z } from "zod";
import {
  color as colorEngine,
  toColorSpace,
  toValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import { fontWeightNames } from "@webstudio-is/fonts";
import { getStyleDeclKey } from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import { isPlainRecord as isRecord } from "../shared/type-utils";
import type { BuilderRuntimeContext } from "./context";
import { throwBuilderRuntimeError } from "./errors";
import { createRuntimeMutationAccumulator } from "./mutation";
import { getUniqueNameWithSuffix } from "./style-utils";
import {
  createDesignTokens,
  defineCssVariables,
  getCssVariableRootTarget,
  updateDesignTokenStyles,
} from "./styles";

const designTokenSourceInput = z
  .discriminatedUnion("format", [
    z.object({
      format: z.literal("dtcg"),
      document: z
        .unknown()
        .describe(
          "DTCG token document or 2025.10 resolver document. Resolver documents may use sets, modifiers, and resolutionOrder."
        ),
      contexts: z
        .record(z.string(), z.string())
        .optional()
        .describe("Resolver modifier contexts keyed by modifier name"),
      documents: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Bundled DTCG documents keyed by resolver source path"),
    }),
    z.object({
      format: z.literal("figma"),
      document: z
        .unknown()
        .describe(
          "Figma Variables API document containing variables and optional variableCollections"
        ),
      mode: z
        .string()
        .min(1)
        .optional()
        .describe("Optional Figma mode name or id"),
      allModes: z
        .boolean()
        .optional()
        .describe("Import every Figma mode under mode-qualified token names"),
    }),
  ])
  .refine(
    (source) =>
      source.format !== "figma" ||
      source.mode === undefined ||
      source.allModes !== true,
    { message: "Figma source cannot specify both mode and allModes" }
  );

const targetInput = z.discriminatedUnion("target", [
  z.object({ target: z.literal("css-variable") }),
  z.object({
    target: z.literal("design-token"),
    property: z
      .string()
      .min(1)
      .describe(
        "Style property for primitive tokens. Composite tokens use their canonical style properties."
      ),
  }),
]);

export const designTokenImportInput = z.object({
  source: designTokenSourceInput,
  mapping: z
    .record(z.string(), targetInput)
    .optional()
    .describe(
      "Optional targets keyed by token type, such as color or dimension. Keys are token types, not token paths or names."
    ),
  defaultTarget: targetInput.optional(),
  prefix: z.string().optional(),
  breakpoint: z.string().optional(),
  collision: z.enum(["skip", "overwrite", "rename"]).default("skip"),
});

export const designTokenImportPlanEntrySchema = z.object({
  path: z.string(),
  type: z.string(),
  target: z.enum(["css-variable", "design-token"]),
  outputName: z.string(),
  property: z.string().optional(),
  cssValue: z.string(),
  declarations: z.array(
    z.object({ property: z.string(), cssValue: z.string() })
  ),
  action: z.enum(["create", "overwrite", "skip"]),
  conflict: z.boolean(),
});

type NormalizedToken = {
  path: string;
  type: string;
  value: unknown;
};

type CssDeclaration = {
  key?: string;
  property?: string;
  cssValue: string;
};

type ImportPlanEntry = z.infer<typeof designTokenImportPlanEntrySchema>;
type NormalizedImportEntry = Omit<ImportPlanEntry, "action" | "conflict">;

const withDeclarationSummary = (
  entry: Omit<NormalizedImportEntry, "property" | "cssValue">
): NormalizedImportEntry => ({
  ...entry,
  property:
    entry.declarations.length === 1
      ? entry.declarations[0].property
      : undefined,
  cssValue:
    entry.declarations.length === 1
      ? entry.declarations[0].cssValue
      : entry.declarations
          .map(({ property, cssValue }) => `${property}: ${cssValue}`)
          .join("; "),
});

type ImportState = Pick<
  BuilderState,
  "breakpoints" | "pages" | "styles" | "styleSources" | "styleSourceSelections"
>;

const dtcgTokenTypeInput = z.enum([
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "number",
  "strokeStyle",
  "border",
  "transition",
  "shadow",
  "gradient",
  "typography",
]);

type DtcgTokenType = z.infer<typeof dtcgTokenTypeInput>;

const numberWithUnitInput = z
  .object({
    value: z.number(),
    unit: z.string(),
  })
  .strict();

const cubicBezierValueInput = z.tuple([
  z.number().min(0).max(1),
  z.number(),
  z.number().min(0).max(1),
  z.number(),
]);

const colorValueInput = z.union([
  z.string().min(1),
  z
    .object({
      colorSpace: z.enum([
        "srgb",
        "srgb-linear",
        "hsl",
        "hwb",
        "lab",
        "lch",
        "oklab",
        "oklch",
        "display-p3",
        "a98-rgb",
        "prophoto-rgb",
        "rec2020",
        "xyz-d65",
        "xyz-d50",
      ]),
      components: z.tuple([
        z.union([z.number(), z.literal("none")]),
        z.union([z.number(), z.literal("none")]),
        z.union([z.number(), z.literal("none")]),
      ]),
      alpha: z.number().min(0).max(1).optional(),
      hex: z.string().optional(),
    })
    .strict(),
]);

const fontFamilyValueInput = z.union([
  z.string().min(1),
  z.array(z.string()).min(1),
]);

const fontWeightValueInput = z.union([
  z.number().min(1).max(1000),
  z.enum([
    "thin",
    "hairline",
    "extra-light",
    "ultra-light",
    "light",
    "normal",
    "regular",
    "book",
    "medium",
    "semi-bold",
    "demi-bold",
    "bold",
    "extra-bold",
    "ultra-bold",
    "black",
    "heavy",
    "extra-black",
    "ultra-black",
  ]),
]);

const strokeStyleValueInput = z.union([
  z.enum([
    "solid",
    "dashed",
    "dotted",
    "double",
    "groove",
    "ridge",
    "outset",
    "inset",
  ]),
  z
    .object({
      dashArray: z.array(numberWithUnitInput).min(1),
      lineCap: z.enum(["round", "butt", "square"]),
    })
    .strict(),
]);

const shadowValueInput = z
  .object({
    color: colorValueInput,
    offsetX: numberWithUnitInput,
    offsetY: numberWithUnitInput,
    blur: numberWithUnitInput,
    spread: numberWithUnitInput,
    inset: z.boolean().optional(),
  })
  .strict();

const dtcgValueInputs = {
  color: colorValueInput,
  dimension: numberWithUnitInput,
  fontFamily: fontFamilyValueInput,
  fontWeight: fontWeightValueInput,
  duration: numberWithUnitInput,
  cubicBezier: cubicBezierValueInput,
  number: z.number(),
  strokeStyle: strokeStyleValueInput,
  border: z
    .object({
      color: colorValueInput,
      width: numberWithUnitInput,
      style: strokeStyleValueInput,
    })
    .strict(),
  transition: z
    .object({
      duration: numberWithUnitInput,
      delay: numberWithUnitInput,
      timingFunction: cubicBezierValueInput,
    })
    .strict(),
  shadow: z.union([shadowValueInput, z.array(shadowValueInput).min(1)]),
  gradient: z
    .array(
      z
        .object({
          color: colorValueInput,
          position: z.number().min(0).max(1),
        })
        .strict()
    )
    .min(1),
  typography: z
    .object({
      fontFamily: fontFamilyValueInput,
      fontSize: numberWithUnitInput,
      fontWeight: fontWeightValueInput,
      letterSpacing: numberWithUnitInput,
      lineHeight: z.number(),
    })
    .strict(),
} satisfies Partial<Record<DtcgTokenType, z.ZodType>>;

type DtcgColor = Exclude<z.infer<(typeof dtcgValueInputs)["color"]>, string>;

const dtcgMetadataProperties = [
  "$deprecated",
  "$description",
  "$extensions",
  "$type",
] as const;
const dtcgTokenProperties = new Set([
  ...dtcgMetadataProperties,
  "$ref",
  "$value",
]);
const dtcgGroupProperties = new Set([
  ...dtcgMetadataProperties,
  "$extends",
  "$root",
  "$schema",
]);

const getFigmaDocumentData = (document: unknown) => {
  if (isRecord(document) === false) {
    return;
  }
  const meta = isRecord(document.meta) ? document.meta : document;
  const variables = isRecord(meta.variables) ? meta.variables : undefined;
  if (variables === undefined) {
    return;
  }
  return {
    variables,
    variableCollections: isRecord(meta.variableCollections)
      ? meta.variableCollections
      : {},
  };
};

const hasDtcgToken = (
  value: unknown,
  inheritedType?: DtcgTokenType
): boolean => {
  if (isRecord(value) === false) {
    return false;
  }
  const parsedType = dtcgTokenTypeInput.safeParse(value.$type);
  const type = parsedType.success ? parsedType.data : inheritedType;
  if (
    type !== undefined &&
    ("$value" in value || typeof value.$ref === "string")
  ) {
    return true;
  }
  return Object.entries(value).some(
    ([name, child]) =>
      (name.startsWith("$") === false || name === "$root") &&
      hasDtcgToken(child, type)
  );
};

const isDtcgToken = (value: unknown) =>
  isRecord(value) &&
  ("$value" in value ||
    (Object.keys(value).every((key) => key.startsWith("$")) &&
      "$ref" in value));

const mergeDtcgDocuments = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> => {
  const result = { ...target };
  for (const [name, value] of Object.entries(source)) {
    const previous = result[name];
    result[name] =
      isRecord(previous) &&
      isRecord(value) &&
      isDtcgToken(previous) === false &&
      isDtcgToken(value) === false
        ? mergeDtcgDocuments(previous, value)
        : value;
  }
  return result;
};

const resolveJsonPointer = (document: unknown, pointer: string) => {
  if (pointer === "#") {
    return document;
  }
  if (pointer.startsWith("#/") === false) {
    return;
  }
  let value = document;
  for (const encodedSegment of pointer.slice(2).split("/")) {
    const segment = encodedSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    if (Array.isArray(value)) {
      const index = Number(segment);
      if (
        Number.isInteger(index) === false ||
        index < 0 ||
        index >= value.length
      ) {
        return;
      }
      value = value[index];
      continue;
    }
    if (isRecord(value) === false || Object.hasOwn(value, segment) === false) {
      return;
    }
    value = value[segment];
  }
  return value;
};

const resolveDtcgResolver = ({
  document,
  contexts = {},
  documents = {},
}: {
  document: Record<string, unknown>;
  contexts?: Record<string, string>;
  documents?: Record<string, unknown>;
}) => {
  if (
    document.version !== "2025.10" ||
    Array.isArray(document.resolutionOrder) === false
  ) {
    return document;
  }
  const resolveReference = (reference: string, stack: string[]): unknown => {
    const [pathname, fragment] = reference.split("#", 2);
    const sourceDocument = pathname === "" ? document : documents[pathname];
    if (sourceDocument === undefined) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG resolver source ${JSON.stringify(pathname)} was not provided in source.documents`
      );
    }
    const key = `${pathname}#${fragment ?? ""}`;
    if (stack.includes(key)) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG resolver reference cycle: ${[...stack, key].join(" -> ")}`
      );
    }
    const target =
      fragment === undefined
        ? sourceDocument
        : resolveJsonPointer(sourceDocument, `#${fragment}`);
    if (target === undefined) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG resolver reference ${reference} does not exist`
      );
    }
    if (isRecord(target) && Array.isArray(target.sources)) {
      return resolveSources(target.sources, [...stack, key]);
    }
    if (isRecord(target) && isRecord(target.contexts)) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG resolver source ${reference} cannot reference a modifier`
      );
    }
    return target;
  };
  const resolveSources = (sources: unknown[], stack: string[]) => {
    let merged: Record<string, unknown> = {};
    for (const source of sources) {
      const resolved =
        isRecord(source) &&
        typeof source.$ref === "string" &&
        Object.keys(source).every((key) => key.startsWith("$"))
          ? resolveReference(source.$ref, stack)
          : source;
      if (isRecord(resolved) === false) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          "DTCG resolver sources must resolve to token documents"
        );
      }
      merged = mergeDtcgDocuments(merged, resolved);
    }
    return merged;
  };
  const resolveItem = (item: unknown) => {
    if (isRecord(item) && typeof item.$ref === "string") {
      const match = item.$ref.match(/^#\/(sets|modifiers)\/([^/]+)$/);
      if (match !== null) {
        const target = resolveJsonPointer(document, item.$ref);
        if (isRecord(target)) {
          return {
            ...target,
            type: match[1] === "sets" ? "set" : "modifier",
            name: match[2].replaceAll("~1", "/").replaceAll("~0", "~"),
          };
        }
      }
      return resolveReference(item.$ref, []);
    }
    return item;
  };

  let resolvedDocument: Record<string, unknown> = {};
  const modifierNames = new Set<string>();
  for (const entry of document.resolutionOrder) {
    const item = resolveItem(entry);
    if (
      isRecord(item) === false ||
      (item.type !== "set" && item.type !== "modifier")
    ) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        "DTCG resolver resolutionOrder entries must resolve to sets or modifiers"
      );
    }
    if (item.type === "set") {
      if (Array.isArray(item.sources) === false) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          "DTCG resolver set is missing sources"
        );
      }
      resolvedDocument = mergeDtcgDocuments(
        resolvedDocument,
        resolveSources(item.sources, [])
      );
      continue;
    }
    if (
      typeof item.name !== "string" ||
      isRecord(item.contexts) === false ||
      Object.keys(item.contexts).length === 0
    ) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        "DTCG resolver modifier is missing name or contexts"
      );
    }
    if (modifierNames.has(item.name)) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG resolver modifier ${item.name} appears more than once`
      );
    }
    modifierNames.add(item.name);
    const selectedContext = contexts[item.name] ?? item.default;
    const sources =
      selectedContext === undefined
        ? undefined
        : item.contexts[selectedContext];
    if (Array.isArray(sources) === false) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        selectedContext === undefined
          ? `DTCG resolver modifier ${item.name} requires a context`
          : `DTCG resolver modifier ${item.name} has no context ${JSON.stringify(selectedContext)}`
      );
    }
    resolvedDocument = mergeDtcgDocuments(
      resolvedDocument,
      resolveSources(sources, [])
    );
  }
  for (const name of Object.keys(contexts)) {
    if (modifierNames.has(name) === false) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG resolver context was provided for unknown modifier ${name}`
      );
    }
  }
  return resolvedDocument;
};

const resolveDtcgGroupExtensions = (document: Record<string, unknown>) => {
  const groups = new Map<string, Record<string, unknown>>();
  const collect = (value: Record<string, unknown>, path: string[]) => {
    if (isDtcgToken(value)) {
      return;
    }
    if (path.length > 0) {
      groups.set(path.join("."), value);
    }
    for (const [name, child] of Object.entries(value)) {
      if (name.startsWith("$") === false && isRecord(child)) {
        collect(child, [...path, name]);
      }
    }
  };
  collect(document, []);

  const resolveGroup = (
    group: Record<string, unknown>,
    path: string[],
    stack: string[]
  ): Record<string, unknown> => {
    const groupReference =
      typeof group.$extends === "string"
        ? group.$extends
        : typeof group.$ref === "string" &&
            Object.keys(group).some((name) => name.startsWith("$") === false)
          ? group.$ref
          : undefined;
    let resolved = group;
    if (groupReference !== undefined) {
      const referencePath =
        groupReference.startsWith("{") && groupReference.endsWith("}")
          ? groupReference.slice(1, -1)
          : undefined;
      const target =
        referencePath === undefined
          ? resolveJsonPointer(document, groupReference)
          : groups.get(referencePath);
      if (isRecord(target) === false || isDtcgToken(target)) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `DTCG group ${path.join(".")} extends missing or invalid group ${groupReference}`
        );
      }
      const targetKey = referencePath ?? groupReference;
      if (stack.includes(targetKey)) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `DTCG group extension cycle: ${[...stack, targetKey].join(" -> ")}`
        );
      }
      const local = Object.fromEntries(
        Object.entries(group).filter(
          ([name]) => name !== "$extends" && name !== "$ref"
        )
      );
      resolved = mergeDtcgDocuments(
        resolveGroup(target, path, [...stack, targetKey]),
        local
      );
    }
    return Object.fromEntries(
      Object.entries(resolved).map(([name, child]) => [
        name,
        name.startsWith("$") === false && isRecord(child)
          ? resolveGroup(child, [...path, name], stack)
          : child,
      ])
    );
  };

  return resolveGroup(document, [], []);
};

export const detectDesignTokenSource = (
  document: unknown
): z.infer<typeof designTokenSourceInput> | undefined => {
  const figma = getFigmaDocumentData(document);
  if (
    figma !== undefined &&
    Object.values(figma.variables).some(
      (variable) => isRecord(variable) && isRecord(variable.valuesByMode)
    )
  ) {
    return { format: "figma", document };
  }
  if (hasDtcgToken(document)) {
    return { format: "dtcg", document };
  }
  if (
    isRecord(document) &&
    document.version === "2025.10" &&
    Array.isArray(document.resolutionOrder)
  ) {
    return { format: "dtcg", document };
  }
};

const getDtcgTokens = ({
  document: inputDocument,
  contexts,
  documents,
}: {
  document: unknown;
  contexts?: Record<string, string>;
  documents?: Record<string, unknown>;
}): NormalizedToken[] => {
  if (isRecord(inputDocument) === false) {
    return throwBuilderRuntimeError(
      "INVALID_INPUT",
      "DTCG document must be an object"
    );
  }
  const document = resolveDtcgGroupExtensions(
    resolveDtcgResolver({ document: inputDocument, contexts, documents })
  );
  type RawToken = {
    path: string;
    type?: DtcgTokenType;
    value: unknown;
  };
  const rawTokens = new Map<string, RawToken>();
  const rawTokensByAlias = new Map<string, RawToken>();
  const rawTokensByJsonPointer = new Map<string, RawToken>();
  const escapeJsonPointerSegment = (value: string) =>
    value.replaceAll("~", "~0").replaceAll("/", "~1");
  const validateName = (name: string, path: string[]) => {
    if (name.includes("{") || name.includes("}") || name.includes(".")) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG token or group ${[...path, name].join(".")} has an invalid name`
      );
    }
  };
  const validateMetadata = (
    value: Record<string, unknown>,
    path: string[],
    token: boolean
  ) => {
    const location = path.join(".") || "<root>";
    const knownProperties = token ? dtcgTokenProperties : dtcgGroupProperties;
    for (const [name, metadata] of Object.entries(value)) {
      if (name.startsWith("$") === false) {
        continue;
      }
      if (knownProperties.has(name) === false) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `DTCG token or group ${location} has unknown property ${name}`
        );
      }
      const valid =
        name === "$type" ||
        name === "$value" ||
        (name === "$description" && typeof metadata === "string") ||
        (name === "$deprecated" &&
          (typeof metadata === "boolean" || typeof metadata === "string")) ||
        (name === "$extensions" && isRecord(metadata)) ||
        (name === "$root" && isRecord(metadata)) ||
        ((name === "$ref" || name === "$extends" || name === "$schema") &&
          typeof metadata === "string");
      if (valid === false) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `DTCG token or group ${location} has invalid ${name}`
        );
      }
    }
  };
  const visit = (
    value: Record<string, unknown>,
    path: string[],
    inheritedType: DtcgTokenType | undefined,
    pointerPath = path
  ) => {
    const parsedType =
      value.$type === undefined
        ? undefined
        : dtcgTokenTypeInput.safeParse(value.$type);
    if (parsedType !== undefined && parsedType.success === false) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG token or group ${path.join(".") || "<root>"} has invalid $type ${JSON.stringify(value.$type)}`
      );
    }
    const type = parsedType?.data ?? inheritedType;
    const hasValue = "$value" in value;
    const hasReference = "$ref" in value;
    validateMetadata(value, path, hasValue || hasReference);
    if (hasValue || hasReference) {
      if (path.length === 0) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          "DTCG token <root> is missing a name"
        );
      }
      if (hasValue && hasReference) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `DTCG token ${path.join(".")} cannot define both $value and $ref`
        );
      }
      if (hasReference && typeof value.$ref !== "string") {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `DTCG token ${path.join(".")} has an invalid $ref`
        );
      }
      if (
        Object.entries(value).some(
          ([name, child]) => name.startsWith("$") === false && isRecord(child)
        )
      ) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `DTCG token ${path.join(".")} cannot contain child tokens or groups`
        );
      }
      const tokenPath = path.join(".");
      const token = {
        path: tokenPath,
        type,
        value: hasValue ? value.$value : { $ref: value.$ref },
      };
      rawTokens.set(tokenPath, token);
      rawTokensByAlias.set(pointerPath.join("."), token);
      const pointer = `#/${pointerPath.map(escapeJsonPointerSegment).join("/")}`;
      rawTokensByJsonPointer.set(pointer, token);
      if (hasValue) {
        rawTokensByJsonPointer.set(`${pointer}/$value`, token);
      }
      return;
    }
    for (const [name, child] of Object.entries(value)) {
      if (isRecord(child) === false) {
        continue;
      }
      if (name === "$root") {
        visit(child, path, type, [...pointerPath, name]);
        continue;
      }
      if (name.startsWith("$")) {
        continue;
      }
      validateName(name, path);
      visit(child, [...path, name], type, [...pointerPath, name]);
    }
  };
  visit(document, [], undefined);
  if (rawTokens.size === 0) {
    return throwBuilderRuntimeError(
      "INVALID_INPUT",
      "DTCG document does not contain any tokens"
    );
  }

  const getReference = (value: unknown) => {
    if (typeof value === "string") {
      const startsReference = value.startsWith("{");
      const endsReference = value.endsWith("}");
      if (startsReference === false && endsReference === false) {
        return;
      }
      const key = value.slice(1, -1);
      if (
        startsReference === false ||
        endsReference === false ||
        key.length === 0 ||
        key
          .split(".")
          .some(
            (segment) =>
              segment.length === 0 ||
              segment.includes("{") ||
              segment.includes("}") ||
              (segment.startsWith("$") && segment !== "$root")
          )
      ) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `DTCG reference ${JSON.stringify(value)} is invalid`
        );
      }
      return { key, pointer: false } as const;
    }
    if (isRecord(value) && "$ref" in value) {
      if (
        typeof value.$ref !== "string" ||
        value.$ref.startsWith("#/") === false
      ) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `DTCG reference ${JSON.stringify(value.$ref)} is not a local JSON Pointer`
        );
      }
      return { key: value.$ref, pointer: true } as const;
    }
  };
  let resolveToken: (
    token: RawToken,
    stack: string[]
  ) => { type: DtcgTokenType; value: unknown };
  const resolveValue = (value: unknown, stack: string[]): unknown => {
    const reference = getReference(value);
    if (reference !== undefined) {
      const targetToken = reference.pointer
        ? rawTokensByJsonPointer.get(reference.key)
        : rawTokensByAlias.get(reference.key);
      if (targetToken !== undefined) {
        if (stack.includes(targetToken.path)) {
          return throwBuilderRuntimeError(
            "INVALID_INPUT",
            `DTCG alias cycle: ${[...stack, targetToken.path].join(" -> ")}`
          );
        }
        return resolveToken(targetToken, [...stack, targetToken.path]).value;
      }
      if (reference.pointer) {
        if (stack.includes(reference.key)) {
          return throwBuilderRuntimeError(
            "INVALID_INPUT",
            `DTCG alias cycle: ${[...stack, reference.key].join(" -> ")}`
          );
        }
        const targetValue = resolveJsonPointer(document, reference.key);
        if (targetValue !== undefined) {
          return resolveValue(targetValue, [...stack, reference.key]);
        }
      }
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        reference.pointer
          ? `DTCG reference ${reference.key} does not exist`
          : `DTCG token ${stack[0]} references missing alias ${reference.key}`
      );
    }
    if (Array.isArray(value)) {
      return value.map((item) => resolveValue(item, stack));
    }
    if (isRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([name, item]) => [
          name,
          resolveValue(item, stack),
        ])
      );
    }
    return value;
  };
  resolveToken = (token, stack) => {
    const reference = getReference(token.value);
    const target =
      reference === undefined
        ? undefined
        : reference.pointer
          ? rawTokensByJsonPointer.get(reference.key)
          : rawTokensByAlias.get(reference.key);
    if (target === undefined) {
      const value = resolveValue(token.value, stack);
      if (token.type === undefined) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `DTCG token ${token.path} is missing $type`
        );
      }
      return { type: token.type, value };
    }
    if (stack.includes(target.path)) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG alias cycle: ${[...stack, target.path].join(" -> ")}`
      );
    }
    const resolved = resolveToken(target, [...stack, target.path]);
    if (token.type !== undefined && token.type !== resolved.type) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG token ${token.path} has type ${token.type} but aliases ${resolved.type}`
      );
    }
    return resolved;
  };

  return Array.from(rawTokens.values(), (token) => {
    const resolved = resolveToken(token, [token.path]);
    const valueInput =
      dtcgValueInputs[resolved.type as keyof typeof dtcgValueInputs];
    if (
      valueInput !== undefined &&
      valueInput.safeParse(resolved.value).success === false
    ) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG token ${token.path} has an invalid ${resolved.type} value`
      );
    }
    return { ...token, ...resolved };
  });
};

const genericFontFamilies = new Set([
  "cursive",
  "emoji",
  "fangsong",
  "fantasy",
  "math",
  "monospace",
  "sans-serif",
  "serif",
  "system-ui",
  "ui-monospace",
  "ui-rounded",
  "ui-sans-serif",
  "ui-serif",
]);

const toCssFontFamily = (value: string) =>
  genericFontFamilies.has(value) ? value : JSON.stringify(value);

const toDtcgColorCss = (color: DtcgColor) => {
  const colorSpace = toColorSpace(colorEngine.ColorSpace.get(color.colorSpace));
  const alpha = color.alpha ?? 1;
  if (color.components.every((component) => typeof component === "number")) {
    return toValue({
      type: "color",
      colorSpace,
      components: color.components as [number, number, number],
      alpha,
    });
  }
  const [c1, c2, c3] = color.components;
  const component = (value: number | "none", suffix = "") =>
    value === "none" ? value : `${value}${suffix}`;
  switch (colorSpace) {
    case "hsl":
      return `hsl(${component(c1)} ${component(c2, "%")} ${component(c3, "%")} / ${alpha})`;
    case "hwb":
      return `hwb(${component(c1)} ${component(c2, "%")} ${component(c3, "%")} / ${alpha})`;
    case "lab":
      return `lab(${component(c1, "%")} ${component(c2)} ${component(c3)} / ${alpha})`;
    case "lch":
      return `lch(${component(c1, "%")} ${component(c2)} ${component(c3)} / ${alpha})`;
    case "oklab":
      return `oklab(${component(c1)} ${component(c2)} ${component(c3)} / ${alpha})`;
    case "oklch":
      return `oklch(${component(c1)} ${component(c2)} ${component(c3)} / ${alpha})`;
    default:
      return `color(${color.colorSpace} ${component(c1)} ${component(c2)} ${component(c3)} / ${alpha})`;
  }
};

const getFigmaTokens = (
  document: unknown,
  mode?: string,
  allModes = false
): NormalizedToken[] => {
  const figma = getFigmaDocumentData(document);
  if (figma === undefined) {
    return throwBuilderRuntimeError(
      "INVALID_INPUT",
      "Figma document must contain meta.variables"
    );
  }
  const { variables, variableCollections } = figma;
  const selectValue = (
    id: string,
    variable: Record<string, unknown>,
    requestedMode: string | undefined
  ): { value: unknown; mode: string } => {
    if (isRecord(variable.valuesByMode) === false) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `Figma variable ${id} is missing valuesByMode`
      );
    }
    const collectionId =
      typeof variable.variableCollectionId === "string"
        ? variable.variableCollectionId
        : undefined;
    const collection =
      collectionId === undefined ||
      isRecord(variableCollections[collectionId]) === false
        ? undefined
        : variableCollections[collectionId];
    const modes = Array.isArray(collection?.modes) ? collection.modes : [];
    const selectedMode =
      requestedMode === undefined
        ? typeof collection?.defaultModeId === "string" &&
          variable.valuesByMode[collection.defaultModeId] !== undefined
          ? collection.defaultModeId
          : Object.keys(variable.valuesByMode)[0]
        : variable.valuesByMode[requestedMode] !== undefined
          ? requestedMode
          : modes.find(
              (candidate) =>
                isRecord(candidate) && candidate.name === requestedMode
            )?.modeId;
    if (
      typeof selectedMode !== "string" ||
      variable.valuesByMode[selectedMode] === undefined
    ) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `Figma variable ${typeof variable.name === "string" ? variable.name : id} has no value for mode ${JSON.stringify(requestedMode)}`
      );
    }
    const modeMetadata = modes.find(
      (candidate) => isRecord(candidate) && candidate.modeId === selectedMode
    );
    const modeName =
      isRecord(modeMetadata) && typeof modeMetadata.name === "string"
        ? modeMetadata.name
        : selectedMode;
    return {
      value: variable.valuesByMode[selectedMode],
      mode: modeName,
    };
  };
  const resolveVariable = (
    id: string,
    requestedMode: string | undefined,
    stack: string[]
  ): unknown => {
    const variable = variables[id];
    if (isRecord(variable) === false) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `Figma variable references missing alias ${id}`
      );
    }
    const selected = selectValue(id, variable, requestedMode);
    const value = selected.value;
    if (isRecord(value) === false || value.type !== "VARIABLE_ALIAS") {
      return value;
    }
    if (typeof value.id !== "string") {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `Figma variable ${typeof variable.name === "string" ? variable.name : id} has an invalid alias`
      );
    }
    if (stack.includes(value.id)) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `Figma variable alias cycle: ${[...stack, value.id].join(" -> ")}`
      );
    }
    return resolveVariable(value.id, selected.mode, [...stack, value.id]);
  };

  return Object.entries(variables).flatMap<NormalizedToken>(
    ([id, variable]) => {
      if (
        isRecord(variable) === false ||
        typeof variable.name !== "string" ||
        isRecord(variable.valuesByMode) === false
      ) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `Figma variable ${id} is missing name or valuesByMode`
        );
      }
      const variableName = variable.name;
      const collectionId =
        typeof variable.variableCollectionId === "string"
          ? variable.variableCollectionId
          : undefined;
      const collection =
        collectionId === undefined ||
        isRecord(variableCollections[collectionId]) === false
          ? undefined
          : variableCollections[collectionId];
      const collectionModes = Array.isArray(collection?.modes)
        ? collection.modes
            .filter(
              (candidate): candidate is Record<string, unknown> =>
                isRecord(candidate) && typeof candidate.modeId === "string"
            )
            .map((candidate) => String(candidate.modeId))
        : [];
      const requestedModes = allModes
        ? collectionModes.length > 0
          ? collectionModes
          : Object.keys(variable.valuesByMode)
        : [mode];
      return requestedModes.map((requestedMode) => {
        const selected = selectValue(id, variable, requestedMode);
        const name = allModes
          ? `${variableName}/${selected.mode}`
          : variableName;
        return {
          path: name,
          type:
            typeof variable.resolvedType === "string"
              ? variable.resolvedType.toLowerCase()
              : "unknown",
          value: resolveVariable(id, selected.mode, [id]),
        };
      });
    }
  );
};

const toCssValue = (token: NormalizedToken) => {
  const { value } = token;
  if (token.type === "fontWeight" && typeof value === "string") {
    const weight =
      value === "book"
        ? 400
        : value === "extra-black" || value === "ultra-black"
          ? 950
          : fontWeightNames.get(value.replaceAll("-", " "));
    return String(weight ?? value);
  }
  if (
    token.type === "fontFamily" &&
    (typeof value === "string" ||
      (Array.isArray(value) && value.every((item) => typeof item === "string")))
  ) {
    const families = typeof value === "string" ? [value] : value;
    return families.map(toCssFontFamily).join(", ");
  }
  if (["string", "number", "boolean"].includes(typeof value)) {
    return String(value);
  }
  if (
    token.type === "cubicBezier" &&
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((item) => typeof item === "number")
  ) {
    return `cubic-bezier(${value.join(", ")})`;
  }
  if (isRecord(value)) {
    if (typeof value.value === "number" && typeof value.unit === "string") {
      const allowedUnits =
        token.type === "dimension"
          ? ["px", "rem"]
          : token.type === "duration"
            ? ["ms", "s"]
            : undefined;
      if (
        allowedUnits !== undefined &&
        allowedUnits.includes(value.unit) === false
      ) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `Token ${token.path} has invalid ${token.type} unit ${value.unit}`
        );
      }
      return `${value.value}${value.unit}`;
    }
    if (
      [value.r, value.g, value.b].every(
        (channel) => typeof channel === "number"
      )
    ) {
      const channels = [value.r, value.g, value.b].map((channel) =>
        Math.round(Number(channel) * 255)
      );
      const alpha = typeof value.a === "number" ? value.a : 1;
      return `rgb(${channels.join(" ")} / ${alpha})`;
    }
    if (
      typeof value.colorSpace === "string" &&
      Array.isArray(value.components) &&
      value.components.length === 3
    ) {
      return toDtcgColorCss(value as DtcgColor);
    }
  }
  return throwBuilderRuntimeError(
    "INVALID_INPUT",
    `Token ${token.path} has a composite value that cannot be represented as one CSS value`
  );
};

const toCssDeclarations = (token: NormalizedToken): CssDeclaration[] => {
  const value = token.value;
  const convert = (type: string, child: unknown) =>
    toCssValue({ ...token, type, value: child });
  if (token.type === "strokeStyle" && isRecord(value)) {
    return [
      {
        key: "dash-array",
        property: "stroke-dasharray",
        cssValue: (value.dashArray as unknown[])
          .map((item: unknown) => convert("dimension", item))
          .join(" "),
      },
      {
        key: "line-cap",
        property: "stroke-linecap",
        cssValue: String(value.lineCap),
      },
    ];
  }
  if (token.type === "border" && isRecord(value)) {
    if (typeof value.style === "string") {
      return [
        {
          property: "border",
          cssValue: `${convert("dimension", value.width)} ${convert("strokeStyle", value.style)} ${convert("color", value.color)}`,
        },
      ];
    }
    return [
      {
        key: "color",
        property: "border-color",
        cssValue: convert("color", value.color),
      },
      {
        key: "width",
        property: "border-width",
        cssValue: convert("dimension", value.width),
      },
      ...toCssDeclarations({
        ...token,
        type: "strokeStyle",
        value: value.style,
      }),
    ];
  }
  if (token.type === "transition" && isRecord(value)) {
    return [
      {
        property: "transition",
        cssValue: `${convert("duration", value.duration)} ${convert("cubicBezier", value.timingFunction)} ${convert("duration", value.delay)}`,
      },
    ];
  }
  if (token.type === "shadow") {
    const shadows = Array.isArray(value) ? value : [value];
    return [
      {
        property: "box-shadow",
        cssValue: shadows
          .map((shadow) => {
            if (isRecord(shadow) === false) {
              return "";
            }
            return [
              shadow.inset === true ? "inset" : undefined,
              convert("dimension", shadow.offsetX),
              convert("dimension", shadow.offsetY),
              convert("dimension", shadow.blur),
              convert("dimension", shadow.spread),
              convert("color", shadow.color),
            ]
              .filter((part) => part !== undefined)
              .join(" ");
          })
          .join(", "),
      },
    ];
  }
  if (token.type === "gradient" && Array.isArray(value)) {
    return [
      {
        property: "background-image",
        cssValue: `linear-gradient(90deg, ${value
          .map((stop) => {
            if (isRecord(stop) === false) {
              return "";
            }
            return `${convert("color", stop.color)} ${Number(stop.position) * 100}%`;
          })
          .join(", ")})`,
      },
    ];
  }
  if (token.type === "typography" && isRecord(value)) {
    return [
      {
        key: "font-family",
        property: "font-family",
        cssValue: convert("fontFamily", value.fontFamily),
      },
      {
        key: "font-size",
        property: "font-size",
        cssValue: convert("dimension", value.fontSize),
      },
      {
        key: "font-weight",
        property: "font-weight",
        cssValue: convert("fontWeight", value.fontWeight),
      },
      {
        key: "letter-spacing",
        property: "letter-spacing",
        cssValue: convert("dimension", value.letterSpacing),
      },
      {
        key: "line-height",
        property: "line-height",
        cssValue: convert("number", value.lineHeight),
      },
    ];
  }
  return [{ cssValue: toCssValue(token) }];
};

const toImportedTokenName = (name: string) => {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (normalized.length === 0) {
    return throwBuilderRuntimeError(
      "INVALID_INPUT",
      `Token name ${JSON.stringify(name)} cannot form an imported token name`
    );
  }
  return normalized;
};

const toCssVariableName = (name: string) => `--${toImportedTokenName(name)}`;

export const normalizeDesignTokenImport = (
  input: z.infer<typeof designTokenImportInput>
): NormalizedImportEntry[] => {
  const tokens =
    input.source.format === "dtcg"
      ? getDtcgTokens(input.source)
      : getFigmaTokens(
          input.source.document,
          input.source.mode,
          input.source.allModes
        );
  const prefix = input.prefix?.trim();
  return tokens.flatMap<NormalizedImportEntry>((token) => {
    const target =
      input.mapping?.[token.type] ??
      input.defaultTarget ??
      ({ target: "css-variable" } as const);
    const sourceName =
      prefix === undefined ? token.path : `${prefix}.${token.path}`;
    const { value: _value, ...summary } = token;
    const declarations = toCssDeclarations(token);
    if (target.target === "css-variable") {
      return declarations.map((declaration) => {
        const outputName = toCssVariableName(
          declaration.key === undefined
            ? sourceName
            : `${sourceName}.${declaration.key}`
        );
        return withDeclarationSummary({
          ...summary,
          target: target.target,
          outputName,
          declarations: [
            { property: outputName, cssValue: declaration.cssValue },
          ],
        });
      });
    }
    const normalizedDeclarations = declarations.map((declaration) => ({
      property:
        declarations.length === 1
          ? target.property
          : (declaration.property ?? target.property),
      cssValue: declaration.cssValue,
    }));
    return [
      withDeclarationSummary({
        ...summary,
        target: target.target,
        outputName: toImportedTokenName(sourceName),
        declarations: normalizedDeclarations,
      }),
    ];
  });
};

const getImportState = (state: ImportState, breakpoint: string | undefined) => {
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
  const cssVariableTarget = getCssVariableRootTarget(state, breakpoint);
  const existingCssVariables = new Set<string>(
    Array.from(state.styles.values())
      .filter(
        (style) =>
          style.styleSourceId === cssVariableTarget.styleSourceId &&
          style.breakpointId === cssVariableTarget.breakpointId &&
          style.property.startsWith("--")
      )
      .map((style) => style.property)
  );
  const existingTokens = new Map(
    Array.from(state.styleSources.values())
      .filter((source) => source.type === "token")
      .map((source) => [source.name, source])
  );
  const propertiesByStyleSource = new Map<string, Set<string>>();
  for (const style of state.styles.values()) {
    if (
      style.breakpointId !== cssVariableTarget.breakpointId ||
      style.state !== undefined
    ) {
      continue;
    }
    const properties =
      propertiesByStyleSource.get(style.styleSourceId) ?? new Set<string>();
    properties.add(style.property);
    propertiesByStyleSource.set(style.styleSourceId, properties);
  }
  return {
    cssVariableTarget,
    existingCssVariables,
    existingTokens,
    propertiesByStyleSource,
  };
};

const isMatchingImportEntry = ({
  state,
  entry,
  importState,
}: {
  state: ImportState;
  entry: NormalizedImportEntry;
  importState: ReturnType<typeof getImportState>;
}) => {
  const { cssVariableTarget, existingTokens, propertiesByStyleSource } =
    importState;
  const styleSourceId =
    entry.target === "css-variable"
      ? cssVariableTarget.styleSourceId
      : existingTokens.get(entry.outputName)?.id;
  if (styleSourceId === undefined) {
    return false;
  }
  const declarationsMatch = entry.declarations.every((declaration) => {
    const style = state.styles?.get(
      getStyleDeclKey({
        styleSourceId,
        breakpointId: cssVariableTarget.breakpointId as string,
        property: declaration.property as StyleProperty,
        state: undefined,
      })
    );
    return style !== undefined && toValue(style.value) === declaration.cssValue;
  });
  if (entry.target === "css-variable") {
    return declarationsMatch;
  }
  return (
    declarationsMatch &&
    propertiesByStyleSource.get(styleSourceId)?.size ===
      entry.declarations.length
  );
};

const renameImportEntry = (
  entry: NormalizedImportEntry,
  outputName: string
): NormalizedImportEntry => {
  if (entry.target === "design-token") {
    return { ...entry, outputName };
  }
  return withDeclarationSummary({
    ...entry,
    outputName,
    declarations: entry.declarations.map((declaration) => ({
      ...declaration,
      property: outputName,
    })),
  });
};

const createImportPlan = (
  state: ImportState,
  input: z.infer<typeof designTokenImportInput>,
  importState: ReturnType<typeof getImportState>
): ImportPlanEntry[] => {
  const { existingCssVariables, existingTokens } = importState;
  const normalized = normalizeDesignTokenImport(input);
  const seen = new Set<string>();
  const occupiedNames = {
    "css-variable": new Set(existingCssVariables),
    "design-token": new Set(existingTokens.keys()),
  };
  for (const token of normalized) {
    const key = `${token.target}:${token.outputName}`;
    if (seen.has(key)) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `Multiple source tokens map to ${token.outputName}`
      );
    }
    seen.add(key);
    occupiedNames[token.target].add(token.outputName);
  }
  return normalized.map((token) => {
    const exists =
      token.target === "css-variable"
        ? existingCssVariables.has(token.outputName)
        : existingTokens.has(token.outputName);
    const conflict =
      exists &&
      isMatchingImportEntry({
        state,
        entry: token,
        importState,
      }) === false;
    if (exists && conflict === false) {
      return { ...token, action: "skip" as const, conflict };
    }
    if (conflict && input.collision === "rename") {
      const outputName = getUniqueNameWithSuffix(
        token.outputName,
        occupiedNames[token.target]
      );
      occupiedNames[token.target].add(outputName);
      return {
        ...renameImportEntry(token, outputName),
        action: "create" as const,
        conflict,
      };
    }
    return {
      ...token,
      action: exists
        ? input.collision === "overwrite"
          ? "overwrite"
          : "skip"
        : "create",
      conflict,
    };
  });
};

export const planDesignTokenImport = (
  state: ImportState,
  input: z.infer<typeof designTokenImportInput>
) => createImportPlan(state, input, getImportState(state, input.breakpoint));

const toDesignTokenStyles = (
  entry: ImportPlanEntry,
  breakpoint: string | undefined
) =>
  entry.declarations.map(({ property, cssValue }) => ({
    property,
    value: { type: "unparsed" as const, value: cssValue },
    breakpoint,
  }));

export const importDesignTokens = (
  state: ImportState,
  input: z.infer<typeof designTokenImportInput>,
  context: BuilderRuntimeContext
) => {
  const importState = getImportState(state, input.breakpoint);
  const plan = createImportPlan(state, input, importState);
  const { existingTokens } = importState;
  const accumulator = createRuntimeMutationAccumulator(state);
  const cssVariables = Object.fromEntries(
    plan
      .filter(
        (entry) => entry.target === "css-variable" && entry.action !== "skip"
      )
      .map((entry) => [entry.outputName, entry.declarations[0].cssValue])
  );
  if (Object.keys(cssVariables).length > 0) {
    accumulator.stage(
      defineCssVariables(
        accumulator.state,
        {
          vars: cssVariables,
          overwrite: input.collision === "overwrite",
          breakpoint: input.breakpoint,
        },
        context
      )
    );
  }
  const created = plan.filter(
    (entry) => entry.target === "design-token" && entry.action === "create"
  );
  if (created.length > 0) {
    accumulator.stage(
      createDesignTokens(
        accumulator.state,
        {
          tokens: created.map((entry) => ({
            name: entry.outputName,
            declarations: toDesignTokenStyles(entry, input.breakpoint),
          })),
        },
        context
      )
    );
  }
  for (const entry of plan) {
    if (entry.target !== "design-token" || entry.action !== "overwrite") {
      continue;
    }
    const designTokenId = existingTokens.get(entry.outputName)?.id;
    if (designTokenId !== undefined) {
      accumulator.stage(
        updateDesignTokenStyles(accumulator.state, {
          designTokenId,
          updates: toDesignTokenStyles(entry, input.breakpoint),
        })
      );
    }
  }
  const counts = { create: 0, overwrite: 0, skip: 0 };
  for (const entry of plan) {
    counts[entry.action] += 1;
  }
  return accumulator.complete({ plan, counts });
};
