import { z } from "zod";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import { throwBuilderRuntimeError } from "./errors";
import { createRuntimeMutationAccumulator } from "./mutation";
import {
  createDesignTokens,
  defineCssVariables,
  updateDesignTokenStyles,
} from "./styles";

const sourceInput = z.discriminatedUnion("format", [
  z.object({ format: z.literal("dtcg"), document: z.unknown() }),
  z.object({
    format: z.literal("figma"),
    document: z.unknown(),
    modeId: z.string().optional(),
  }),
]);

const targetInput = z.discriminatedUnion("target", [
  z.object({ target: z.literal("css-variable") }),
  z.object({
    target: z.literal("design-token"),
    property: z.string().min(1),
  }),
]);

export const designTokenImportInput = z.object({
  source: sourceInput,
  mapping: z
    .record(z.string(), targetInput)
    .optional()
    .describe(
      "Optional targets keyed by token type, such as color or dimension. Keys are token types, not token paths or names."
    ),
  defaultTarget: targetInput.optional(),
  prefix: z.string().optional(),
  breakpoint: z.string().optional(),
  collision: z.enum(["skip", "overwrite"]).default("skip"),
});

type NormalizedToken = {
  path: string;
  name: string;
  type: string;
  value: unknown;
};

type ImportPlanEntry = Omit<NormalizedToken, "value"> & {
  target: "css-variable" | "design-token";
  outputName: string;
  property?: string;
  cssValue: string;
  action: "create" | "overwrite" | "skip";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

const getDtcgTokens = (document: unknown): NormalizedToken[] => {
  if (isRecord(document) === false) {
    return throwBuilderRuntimeError(
      "INVALID_INPUT",
      "DTCG document must be an object"
    );
  }
  const rawTokens = new Map<
    string,
    { path: string; name: string; type: string; value: unknown }
  >();
  const visit = (
    value: Record<string, unknown>,
    path: string[],
    inheritedType: string | undefined
  ) => {
    const type = typeof value.$type === "string" ? value.$type : inheritedType;
    if ("$value" in value) {
      if (path.length === 0 || type === undefined) {
        return throwBuilderRuntimeError(
          "INVALID_INPUT",
          `DTCG token ${path.join(".") || "<root>"} is missing a name or $type`
        );
      }
      const tokenPath = path.join(".");
      rawTokens.set(tokenPath, {
        path: tokenPath,
        name: tokenPath,
        type,
        value: value.$value,
      });
      return;
    }
    for (const [name, child] of Object.entries(value)) {
      if (name.startsWith("$") === false && isRecord(child)) {
        visit(child, [...path, name], type);
      }
    }
  };
  visit(document, [], undefined);

  const resolve = (token: NormalizedToken, stack: string[]): unknown => {
    if (
      typeof token.value !== "string" ||
      token.value.startsWith("{") === false ||
      token.value.endsWith("}") === false
    ) {
      return token.value;
    }
    const alias = token.value.slice(1, -1);
    const target = rawTokens.get(alias);
    if (target === undefined) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG token ${token.path} references missing alias ${alias}`
      );
    }
    if (stack.includes(alias)) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `DTCG alias cycle: ${[...stack, alias].join(" -> ")}`
      );
    }
    return resolve(target, [...stack, alias]);
  };

  return Array.from(rawTokens.values(), (token) => ({
    ...token,
    value: resolve(token, [token.path]),
  }));
};

const figmaType = (value: unknown) =>
  typeof value === "string" ? value.toLowerCase() : "unknown";

const getFigmaTokens = (
  document: unknown,
  modeId?: string
): NormalizedToken[] => {
  if (isRecord(document) === false) {
    return throwBuilderRuntimeError(
      "INVALID_INPUT",
      "Figma document must be an object"
    );
  }
  const meta = isRecord(document.meta) ? document.meta : document;
  const variables = isRecord(meta.variables) ? meta.variables : undefined;
  if (variables === undefined) {
    return throwBuilderRuntimeError(
      "INVALID_INPUT",
      "Figma document must contain meta.variables"
    );
  }
  const resolveValue = (value: unknown, stack: string[]): unknown => {
    if (
      isRecord(value) === false ||
      value.type !== "VARIABLE_ALIAS" ||
      typeof value.id !== "string"
    ) {
      return value;
    }
    if (stack.includes(value.id)) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `Figma variable alias cycle: ${[...stack, value.id].join(" -> ")}`
      );
    }
    const target = variables[value.id];
    if (isRecord(target) === false || isRecord(target.valuesByMode) === false) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `Figma variable references missing alias ${value.id}`
      );
    }
    const targetValue =
      (modeId === undefined ? undefined : target.valuesByMode[modeId]) ??
      Object.values(target.valuesByMode)[0];
    return resolveValue(targetValue, [...stack, value.id]);
  };

  return Object.entries(variables).map(([id, variable]) => {
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
    const value =
      (modeId === undefined ? undefined : variable.valuesByMode[modeId]) ??
      Object.values(variable.valuesByMode)[0];
    if (value === undefined) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `Figma variable ${variable.name} has no value for the selected mode`
      );
    }
    return {
      path: variable.name,
      name: variable.name,
      type: figmaType(variable.resolvedType),
      value: resolveValue(value, [id]),
    };
  });
};

const toCssValue = (token: NormalizedToken) => {
  const { value } = token;
  if (["string", "number", "boolean"].includes(typeof value)) {
    return String(value);
  }
  if (isRecord(value)) {
    if (typeof value.value === "number" && typeof value.unit === "string") {
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
      const alpha =
        typeof value.alpha === "number" || typeof value.alpha === "string"
          ? value.alpha
          : 1;
      return `color(${value.colorSpace} ${value.components.join(" ")} / ${alpha})`;
    }
  }
  return throwBuilderRuntimeError(
    "INVALID_INPUT",
    `Token ${token.path} has a composite value that cannot be represented as one CSS value`
  );
};

const toCssVariableName = (name: string) => {
  const normalized = name
    .trim()
    .toLowerCase()
    .split("")
    .map((character) => (/[a-z0-9_-]/.test(character) ? character : "-"))
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (normalized.length === 0) {
    return throwBuilderRuntimeError(
      "INVALID_INPUT",
      `Token name ${JSON.stringify(name)} cannot form a CSS variable name`
    );
  }
  return `--${normalized}`;
};

export const normalizeDesignTokenImport = (
  input: z.infer<typeof designTokenImportInput>
) => {
  const tokens =
    input.source.format === "dtcg"
      ? getDtcgTokens(input.source.document)
      : getFigmaTokens(input.source.document, input.source.modeId);
  const prefix = input.prefix?.trim();
  return tokens.map((token) => {
    const target =
      input.mapping?.[token.type] ??
      input.defaultTarget ??
      ({ target: "css-variable" } as const);
    const outputName =
      prefix === undefined ? token.name : `${prefix}.${token.name}`;
    const { value: _value, ...summary } = token;
    return {
      ...summary,
      target: target.target,
      outputName:
        target.target === "css-variable"
          ? toCssVariableName(outputName)
          : outputName,
      ...(target.target === "design-token"
        ? { property: target.property }
        : {}),
      cssValue: toCssValue(token),
    };
  });
};

export const importDesignTokens = (
  state: Pick<
    BuilderState,
    | "breakpoints"
    | "pages"
    | "styles"
    | "styleSources"
    | "styleSourceSelections"
  >,
  input: z.infer<typeof designTokenImportInput>,
  context: BuilderRuntimeContext
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
  const existingCssVariables = new Set<string>(
    Array.from(state.styles.values(), (style) => style.property).filter(
      (property) => property.startsWith("--")
    )
  );
  const existingTokens = new Map(
    Array.from(state.styleSources.values())
      .filter((source) => source.type === "token")
      .map((source) => [source.name, source])
  );
  const normalized = normalizeDesignTokenImport(input);
  const seen = new Set<string>();
  const plan: ImportPlanEntry[] = normalized.map((token) => {
    const key = `${token.target}:${token.outputName}`;
    if (seen.has(key)) {
      return throwBuilderRuntimeError(
        "INVALID_INPUT",
        `Multiple source tokens map to ${token.outputName}`
      );
    }
    seen.add(key);
    const exists =
      token.target === "css-variable"
        ? existingCssVariables.has(token.outputName)
        : existingTokens.has(token.outputName);
    return {
      ...token,
      action: exists ? input.collision : "create",
    };
  });
  const accumulator = createRuntimeMutationAccumulator(state);
  const cssVariables = Object.fromEntries(
    plan
      .filter(
        (entry) => entry.target === "css-variable" && entry.action !== "skip"
      )
      .map((entry) => [entry.outputName, entry.cssValue])
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
            declarations: [
              {
                property: entry.property ?? "",
                value: { type: "unparsed", value: entry.cssValue },
                breakpoint: input.breakpoint,
              },
            ],
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
          updates: [
            {
              property: entry.property ?? "",
              value: { type: "unparsed", value: entry.cssValue },
              breakpoint: input.breakpoint,
            },
          ],
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
