import type { Breakpoint, PageRedirect } from "@webstudio-is/sdk";
import {
  breakpoint,
  compilerSettings,
  pageRedirect,
  projectMeta,
  projectNewRedirectPath,
  redirectSourcePath,
} from "@webstudio-is/sdk";
import { z } from "zod";
import {
  compactBuilderPatchPayload,
  type BuilderPatchChange,
} from "../contracts/patch";
import {
  validateContactEmail,
  validateProjectAuth,
} from "../contracts/project-settings";
import type { BuilderState } from "../state/builder-state";
import {
  hasReachedBreakpointLimit,
  isBaseBreakpoint,
  isBaseWidthBreakpoint,
} from "./breakpoints";
import type { BuilderRuntimeContext } from "./context";
import {
  getZodValidationIssueOptions,
  throwBuilderRuntimeError,
  throwBuilderValidationError,
} from "./errors";
import { runtimeGeneratedIdInput } from "./generated-id-input";
import { createRuntimeMutation } from "./mutation";
import {
  paginateOutput,
  projectOutput,
  type OutputDetailInput,
  type PaginatedOutputInput,
} from "./output";
import { getRequiredPages } from "./pages";
import {
  marketplaceProduct,
  type MarketplaceProduct,
} from "../shared/marketplace";
import {
  doesRedirectSourceOverridePagePath,
  hasInvalidLocalTargetParams,
  hasNamedSplat,
  normalizeRedirectSource,
  stripRedirectSourceFragment,
} from "./redirect-source";

export {
  parseProjectAuthRoutes,
  validateContactEmail,
  validateProjectAuth,
  validateProjectAuthRoute,
  validateProjectAuthRouteSyntax,
} from "../contracts/project-settings";

const getRequiredBreakpoints = (state: Pick<BuilderState, "breakpoints">) => {
  if (state.breakpoints === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Breakpoints namespace is missing"
    );
  }
  return state.breakpoints;
};

const getRequiredProjectSettings = (
  state: Pick<BuilderState, "projectSettings">
) => {
  if (state.projectSettings === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Project settings namespace is missing"
    );
  }
  return state.projectSettings;
};

const createSettableObjectInput = <Shape extends z.ZodRawShape>(
  schema: z.ZodObject<Shape>
) =>
  z
    .object(
      Object.fromEntries(
        Object.entries(schema.shape).map(([name, value]) => [
          name,
          (value as z.ZodTypeAny).nullable().optional(),
        ])
      ) as unknown as {
        [Name in keyof Shape]: z.ZodOptional<z.ZodNullable<Shape[Name]>>;
      }
    )
    .strict();

const projectMetaUpdateInput = createSettableObjectInput(projectMeta);
const compilerSettingsUpdateInput = createSettableObjectInput(compilerSettings);

export const projectSettingsUpdateInput = z
  .object({
    meta: projectMetaUpdateInput.optional(),
    compiler: compilerSettingsUpdateInput.optional(),
  })
  .strict()
  .refine(
    ({ meta, compiler }) =>
      (meta !== undefined && Object.keys(meta).length > 0) ||
      (compiler !== undefined && Object.keys(compiler).length > 0),
    getZodValidationIssueOptions({
      code: "empty_project_settings_update",
      path: [],
      message: "Provide at least one project setting to update.",
      constraint: "at_least_one_of:meta,compiler",
      example: { meta: { siteName: "Acme" } },
    })
  )
  .describe(
    "Update at least one supported project meta or compiler setting. Null removes a setting."
  );

export const marketplaceProductUpdateInput = marketplaceProduct;

const validateProjectMetaUpdate = (
  values: z.infer<typeof projectMetaUpdateInput>
) => {
  if (typeof values.contactEmail === "string") {
    const contactEmailError = validateContactEmail(values.contactEmail);
    if (contactEmailError !== undefined) {
      return throwBuilderValidationError(contactEmailError, [
        {
          code: "invalid_contact_email",
          path: ["meta", "contactEmail"],
          message: contactEmailError,
          constraint: "comma_separated_email_addresses",
          example: "team@example.com",
        },
      ]);
    }
  }
  if (typeof values.auth === "string") {
    const authError = validateProjectAuth(values.auth);
    if (authError !== undefined) {
      return throwBuilderValidationError(authError, [
        {
          code: "invalid_project_auth",
          path: ["meta", "auth"],
          message: "Invalid project authentication configuration",
          constraint: "valid_webstudio_auth_json",
          example: '{"version":1,"routes":{}}',
          detail: authError,
        },
      ]);
    }
  }
};

export const getProjectSettings = (
  state: Pick<BuilderState, "pages" | "projectSettings">,
  input: OutputDetailInput = {}
) => {
  const pages = getRequiredPages(state);
  const settings = getRequiredProjectSettings(state);
  return projectOutput({
    input,
    compact: { meta: settings.meta, compiler: settings.compiler },
    expanded: () => ({ redirects: pages.redirects ?? [] }),
  });
};

const pushObjectFieldPatches = ({
  patches,
  basePath,
  current,
  values,
}: {
  patches: BuilderPatchChange["patches"];
  basePath: string[];
  current: Record<string, unknown> | undefined;
  values: Record<string, unknown>;
}) => {
  if (current === undefined) {
    const next = Object.fromEntries(
      Object.entries(values).filter(([, value]) => value !== null)
    );
    if (Object.keys(next).length > 0) {
      patches.push({ op: "add", path: basePath, value: next });
    }
    return;
  }
  for (const [name, value] of Object.entries(values)) {
    const exists = Object.hasOwn(current, name);
    if (value === null) {
      if (exists) {
        patches.push({ op: "remove", path: [...basePath, name] });
      }
      continue;
    }
    if (exists && Object.is(current[name], value)) {
      continue;
    }
    patches.push({
      op: exists ? "replace" : "add",
      path: [...basePath, name],
      value,
    });
  }
};

export const updateProjectSettings = (
  state: Pick<BuilderState, "projectSettings">,
  input: z.infer<typeof projectSettingsUpdateInput>
) => {
  const settings = getRequiredProjectSettings(state);
  const patches: BuilderPatchChange["patches"] = [];
  if (input.meta !== undefined) {
    validateProjectMetaUpdate(input.meta);
    pushObjectFieldPatches({
      patches,
      basePath: ["meta"],
      current: settings.meta,
      values: input.meta,
    });
  }
  if (input.compiler !== undefined) {
    pushObjectFieldPatches({
      patches,
      basePath: ["compiler"],
      current: settings.compiler,
      values: input.compiler,
    });
  }
  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([
      { namespace: "projectSettings", patches },
    ]),
    result: { updated: patches.length > 0 },
    invalidatesNamespaces: patches.length === 0 ? [] : ["projectSettings"],
  });
};

export const updateMarketplaceProduct = (
  state: Pick<BuilderState, "marketplaceProduct">,
  input: MarketplaceProduct
) => {
  if (state.marketplaceProduct === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Marketplace product namespace is missing"
    );
  }
  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([
      {
        namespace: "marketplaceProduct",
        patches: [{ op: "replace", path: [], value: input }],
      },
    ]),
    result: { updated: true },
    invalidatesNamespaces: ["marketplaceProduct"],
  });
};

export const getMarketplaceProduct = (
  state: Pick<BuilderState, "marketplaceProduct">
) => {
  if (state.marketplaceProduct === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Marketplace product namespace is missing"
    );
  }
  return { marketplaceProduct: state.marketplaceProduct };
};

const paginateProjectSettingItems = <Item>(
  items: readonly Item[],
  input: PaginatedOutputInput
) =>
  paginateOutput({
    items,
    cursor: input.cursor,
    limit: input.limit,
    filters: {},
    verbose: input.verbose,
  });

export const listRedirects = (
  state: Pick<BuilderState, "pages">,
  input: PaginatedOutputInput = {}
) => {
  const { items, ...pagination } = paginateProjectSettingItems(
    getRequiredPages(state).redirects ?? [],
    input
  );
  return { redirects: items, ...pagination };
};

export const redirectStatusInput = z.enum(["301", "302"]);

export const redirectFieldsInput = z.object({
  old: z.string(),
  new: z.string(),
  status: redirectStatusInput.optional(),
});

export const redirectUpdateFieldsInput = z.object({
  old: z.string().optional(),
  new: z.string().optional(),
  status: redirectStatusInput.nullable().optional(),
});

export const redirectCreateInput = redirectFieldsInput;

export const redirectUpdateInput = z.object({
  old: z.string(),
  values: redirectUpdateFieldsInput,
});

export const redirectDeleteInput = z.object({
  old: z.string(),
});

export const redirectSetAllInput = z.object({
  redirects: z.array(redirectFieldsInput),
});

export type RedirectSourceValidationResult = {
  errors: string[];
  warnings: string[];
};

export const unsupportedRedirectTargetParamMessage =
  "Target route params must match params from the source path";

export const validateRedirectSource = ({
  source,
  redirects,
  existingPaths,
}: {
  source: string;
  redirects: readonly PageRedirect[];
  existingPaths: ReadonlySet<string>;
}): RedirectSourceValidationResult => {
  const sourceValidationResult = redirectSourcePath.safeParse(source);

  if (sourceValidationResult.success === false) {
    return {
      errors: sourceValidationResult.error.format()._errors,
      warnings: [],
    };
  }

  if (hasNamedSplat(source)) {
    return {
      errors: ["Named splats are not supported; use * instead"],
      warnings: [],
    };
  }

  const sourceWithoutFragment = stripRedirectSourceFragment(source);
  const sourcePath = normalizeRedirectSource(source);
  const warnings =
    sourceWithoutFragment === source
      ? []
      : ["Source fragments are ignored because browsers do not send them"];

  if (
    redirects.some(
      (redirect) => normalizeRedirectSource(redirect.old) === sourcePath
    )
  ) {
    return {
      errors: ["This path is already being redirected"],
      warnings,
    };
  }

  if (
    Array.from(existingPaths).some((pagePath) =>
      doesRedirectSourceOverridePagePath(sourcePath, pagePath)
    )
  ) {
    return {
      errors: [],
      warnings: [...warnings, "This redirect will override an existing page"],
    };
  }

  return { errors: [], warnings };
};

export const validateRedirectTarget = ({
  target,
  source,
}: {
  target: string;
  source?: string;
}): string[] => {
  const targetValidationResult = projectNewRedirectPath.safeParse(target);
  if (targetValidationResult.success === false) {
    return targetValidationResult.error.format()._errors;
  }

  if (hasInvalidLocalTargetParams(target, source)) {
    return [unsupportedRedirectTargetParamMessage];
  }

  return [];
};

const findRedirectIndex = (
  redirects: NonNullable<ReturnType<typeof getRequiredPages>["redirects"]>,
  oldPath: string
) => redirects.findIndex((redirect) => redirect.old === oldPath);

const parseRedirect = (input: PageRedirect) => {
  const result = pageRedirect.safeParse(input);
  if (result.success === false) {
    return throwBuilderRuntimeError("BAD_REQUEST", result.error.message);
  }
  if (hasNamedSplat(result.data.old)) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Named splats are not supported; use * instead"
    );
  }
  if (hasInvalidLocalTargetParams(result.data.new, result.data.old)) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Target route params must match params from the source path"
    );
  }
  return result.data;
};

const findNormalizedRedirectIndex = (
  redirects: NonNullable<ReturnType<typeof getRequiredPages>["redirects"]>,
  oldPath: string
) => {
  const normalizedOldPath = normalizeRedirectSource(oldPath);
  return redirects.findIndex(
    (redirect) => normalizeRedirectSource(redirect.old) === normalizedOldPath
  );
};

const assertUniqueRedirectSources = (redirects: PageRedirect[]) => {
  const sources = new Set<string>();
  for (const redirect of redirects) {
    const source = normalizeRedirectSource(redirect.old);
    if (sources.has(source)) {
      return throwBuilderRuntimeError(
        "CONFLICT",
        `Duplicate redirect source "${redirect.old}"`
      );
    }
    sources.add(source);
  }
};

export const createRedirect = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof redirectCreateInput>
) => {
  const pages = getRequiredPages(state);
  const value = parseRedirect(input);
  const redirects = pages.redirects ?? [];
  if (findNormalizedRedirectIndex(redirects, value.old) !== -1) {
    return throwBuilderRuntimeError("CONFLICT", "Redirect already exists");
  }
  const patches: BuilderPatchChange["patches"] = [];
  if (pages.redirects === undefined) {
    patches.push({ op: "add", path: ["redirects"], value: [] });
  }
  patches.push({
    op: "add",
    path: ["redirects", redirects.length],
    value,
  });
  return createRuntimeMutation({
    payload: [{ namespace: "pages", patches }],
    result: { old: value.old },
    invalidatesNamespaces: ["pages"],
  });
};

export const updateRedirect = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof redirectUpdateInput>
) => {
  const pages = getRequiredPages(state);
  const redirects = pages.redirects ?? [];
  const index = findRedirectIndex(redirects, input.old);
  if (index === -1) {
    return throwBuilderRuntimeError("NOT_FOUND", "Redirect not found");
  }
  if (
    input.values.old !== undefined &&
    input.values.old !== input.old &&
    findNormalizedRedirectIndex(redirects, input.values.old) !== -1
  ) {
    return throwBuilderRuntimeError("CONFLICT", "Redirect already exists");
  }
  const nextRedirect: Record<string, unknown> = { ...redirects[index] };
  for (const [name, value] of Object.entries(input.values)) {
    if (value === null) {
      delete nextRedirect[name];
    } else if (value !== undefined) {
      nextRedirect[name] = value;
    }
  }
  parseRedirect(nextRedirect as PageRedirect);
  const patches: BuilderPatchChange["patches"] = [];
  for (const [name, value] of Object.entries(input.values)) {
    if (value === null) {
      if (Object.hasOwn(redirects[index], name)) {
        patches.push({ op: "remove", path: ["redirects", index, name] });
      }
      continue;
    }
    if (value !== undefined) {
      patches.push({
        op: Object.hasOwn(redirects[index], name) ? "replace" : "add",
        path: ["redirects", index, name],
        value,
      });
    }
  }
  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([{ namespace: "pages", patches }]),
    result: { old: input.values.old ?? input.old },
    invalidatesNamespaces: ["pages"],
  });
};

export const deleteRedirect = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof redirectDeleteInput>
) => {
  const redirects = getRequiredPages(state).redirects ?? [];
  const index = findRedirectIndex(redirects, input.old);
  if (index === -1) {
    return throwBuilderRuntimeError("NOT_FOUND", "Redirect not found");
  }
  return createRuntimeMutation({
    payload: [
      {
        namespace: "pages",
        patches: [{ op: "remove", path: ["redirects", index] }],
      },
    ],
    result: { old: input.old },
    invalidatesNamespaces: ["pages"],
  });
};

export const setRedirects = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof redirectSetAllInput>
) => {
  const pages = getRequiredPages(state);
  const redirects = input.redirects.map(parseRedirect);
  assertUniqueRedirectSources(redirects);
  return createRuntimeMutation({
    payload: [
      {
        namespace: "pages",
        patches: [
          {
            op: pages.redirects === undefined ? "add" : "replace",
            path: ["redirects"],
            value: redirects,
          },
        ],
      },
    ],
    result: { count: redirects.length },
    invalidatesNamespaces: ["pages"],
  });
};

export const listBreakpoints = (
  state: Pick<BuilderState, "breakpoints">,
  input: PaginatedOutputInput = {}
) => {
  const { items, ...pagination } = paginateProjectSettingItems(
    Array.from(getRequiredBreakpoints(state).values()),
    input
  );
  return { breakpoints: items, ...pagination };
};

export const breakpointFieldsInput = z.object({
  id: runtimeGeneratedIdInput,
  label: z.string(),
  minWidth: z.number().nonnegative().optional(),
  maxWidth: z.number().nonnegative().optional(),
  condition: z.string().optional(),
});

export const breakpointUpdateFieldsInput = z.object({
  label: z.string().optional(),
  minWidth: z.number().nonnegative().nullable().optional(),
  maxWidth: z.number().nonnegative().nullable().optional(),
  condition: z.string().nullable().optional(),
});

export const breakpointCreateInput = breakpointFieldsInput;

export const breakpointUpdateInput = z.object({
  breakpointId: z.string(),
  values: breakpointUpdateFieldsInput,
});

export const breakpointDeleteInput = z.object({
  breakpointId: z.string(),
});

const parseBreakpoint = (input: Breakpoint) => {
  const result = breakpoint.safeParse(input);
  if (result.success === false) {
    return throwBuilderRuntimeError("BAD_REQUEST", result.error.message);
  }
  return result.data;
};

export const createBreakpoint = (
  state: Pick<BuilderState, "breakpoints">,
  input: z.infer<typeof breakpointCreateInput>,
  context: BuilderRuntimeContext
) => {
  const breakpoints = getRequiredBreakpoints(state);
  const breakpointId = context.createId();
  if (breakpoints.has(breakpointId)) {
    return throwBuilderRuntimeError("CONFLICT", "Breakpoint already exists");
  }
  const value = parseBreakpoint({ ...input, id: breakpointId });
  const canHaveOnlyOneBaseBreakpoint = isBaseWidthBreakpoint(value);
  if (
    canHaveOnlyOneBaseBreakpoint &&
    Array.from(breakpoints.values()).some(isBaseWidthBreakpoint)
  ) {
    return throwBuilderRuntimeError(
      "CONFLICT",
      "Base breakpoint already exists"
    );
  }
  const editableBreakpointCount = Array.from(breakpoints.values()).filter(
    (breakpoint) =>
      breakpoint.condition !== undefined ||
      isBaseBreakpoint(breakpoint) === false
  ).length;
  if (hasReachedBreakpointLimit(editableBreakpointCount)) {
    return throwBuilderRuntimeError("BAD_REQUEST", "Breakpoint limit reached");
  }
  return createRuntimeMutation({
    payload: [
      {
        namespace: "breakpoints",
        patches: [{ op: "add", path: [breakpointId], value }],
      },
    ],
    result: { breakpointId },
    invalidatesNamespaces: ["breakpoints"],
  });
};

export const updateBreakpoint = (
  state: Pick<BuilderState, "breakpoints">,
  input: z.infer<typeof breakpointUpdateInput>
) => {
  const breakpoints = getRequiredBreakpoints(state);
  const current = breakpoints.get(input.breakpointId);
  if (current === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Breakpoint not found");
  }
  if (isBaseWidthBreakpoint(current)) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Base breakpoint cannot be updated"
    );
  }
  const nextBreakpoint: Record<string, unknown> = { ...current };
  for (const [name, value] of Object.entries(input.values)) {
    if (value === null) {
      delete nextBreakpoint[name];
      continue;
    }
    if (value !== undefined) {
      nextBreakpoint[name] = value;
    }
  }
  const value = parseBreakpoint(nextBreakpoint as Breakpoint);
  if (isBaseWidthBreakpoint(value)) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Breakpoint cannot be changed into the base breakpoint"
    );
  }
  return createRuntimeMutation({
    payload: [
      {
        namespace: "breakpoints",
        patches: [{ op: "replace", path: [input.breakpointId], value }],
      },
    ],
    result: { breakpointId: input.breakpointId },
    invalidatesNamespaces: ["breakpoints"],
  });
};

export const deleteBreakpoint = (
  state: Pick<BuilderState, "breakpoints" | "styles">,
  input: z.infer<typeof breakpointDeleteInput>
) => {
  const breakpoints = getRequiredBreakpoints(state);
  if (state.styles === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Styles namespace is missing"
    );
  }
  if (breakpoints.has(input.breakpointId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Breakpoint not found");
  }
  const breakpoint = breakpoints.get(input.breakpointId);
  if (breakpoint !== undefined && isBaseWidthBreakpoint(breakpoint)) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Base breakpoint cannot be deleted"
    );
  }
  const stylePatches: BuilderPatchChange["patches"] = [];
  for (const [key, style] of state.styles) {
    if (style.breakpointId === input.breakpointId) {
      stylePatches.push({ op: "remove", path: [key] });
    }
  }
  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([
      {
        namespace: "breakpoints",
        patches: [{ op: "remove", path: [input.breakpointId] }],
      },
      { namespace: "styles", patches: stylePatches },
    ]),
    result: { breakpointId: input.breakpointId },
    invalidatesNamespaces: ["breakpoints", "styles"],
  });
};
