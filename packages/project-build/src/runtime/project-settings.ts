import type {
  Breakpoint,
  CompilerSettings,
  PageRedirect,
  ProjectMeta,
} from "@webstudio-is/sdk";
import {
  breakpoint,
  compilerSettings,
  pageRedirect,
  projectMeta,
  projectNewRedirectPath,
  redirectSourcePath,
} from "@webstudio-is/sdk";
import { z } from "zod";
import { parseWsAuth, type WsAuthRoute } from "@webstudio-is/wsauth";
import {
  compactBuilderPatchPayload,
  type BuilderPatchChange,
} from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import { hasReachedBreakpointLimit, isBaseBreakpoint } from "./breakpoints";
import type { BuilderRuntimeContext } from "./context";
import { throwBuilderRuntimeError } from "./errors";
import { runtimeGeneratedIdInput } from "./generated-id-input";
import { createRuntimeMutation } from "./mutation";
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

const getRequiredBreakpoints = (state: Pick<BuilderState, "breakpoints">) => {
  if (state.breakpoints === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Breakpoints namespace is missing"
    );
  }
  return state.breakpoints;
};

type Settable<T> = {
  [Property in keyof T]?: T[Property] | null;
};

export const projectSettingsUpdateInput = z.object({
  meta: z.record(z.string(), z.unknown()).optional(),
  compiler: z.record(z.string(), z.unknown()).optional(),
});

export const marketplaceProductUpdateInput = marketplaceProduct;

const projectMetaKeys: ReadonlySet<string> = new Set(
  projectMeta.keyof().options
);
const compilerSettingKeys: ReadonlySet<string> = new Set(
  compilerSettings.keyof().options
);

const emailAddress = z.string().email();

const getContactEmails = (contactEmail: string) => {
  const trimmedContactEmail = contactEmail.trim();
  if (trimmedContactEmail.length === 0) {
    return [];
  }
  return trimmedContactEmail.split(/\s*,\s*/);
};

export const validateContactEmail = (
  contactEmail: string,
  maxContactEmailsPerProject?: number
) => {
  const emails = getContactEmails(contactEmail);
  if (emails.length === 0) {
    return;
  }
  if (
    maxContactEmailsPerProject !== undefined &&
    emails.length > maxContactEmailsPerProject
  ) {
    if (maxContactEmailsPerProject === 0) {
      return `Upgrade to PRO to customize the contact email.`;
    }
    return `Only ${maxContactEmailsPerProject} emails are allowed.`;
  }
  if (
    emails.every((email) => emailAddress.safeParse(email).success) === false
  ) {
    return "Contact email is invalid.";
  }
};

export const validateProjectAuth = (auth: string) => {
  const result = parseWsAuth(auth);
  if (result.errors.length === 0) {
    return;
  }
  return result.errors
    .map((error) => `${error.path}: ${error.message}`)
    .join("\n");
};

export const parseProjectAuthRoutes = (auth: string | undefined) => {
  return parseWsAuth(auth ?? "");
};

export const validateProjectAuthRouteSyntax = (route: string) => {
  const result = parseWsAuth(
    JSON.stringify({
      version: 1,
      routes: {
        [route]: {
          method: "basic",
          login: "login",
          password: "password",
        },
      },
    })
  );
  return result.errors.find((error) =>
    error.path.startsWith(`routes.${JSON.stringify(route)}`)
  )?.message;
};

export const validateProjectAuthRoute = (
  route: string,
  authRoutes: readonly WsAuthRoute[]
) => {
  const errors: string[] = [];
  if (route === "") {
    errors.push("Route is required");
    return errors;
  }
  const routeError = validateProjectAuthRouteSyntax(route);
  if (routeError !== undefined) {
    errors.push(routeError);
  }
  if (authRoutes.some((authRoute) => authRoute.route === route)) {
    errors.push("This route already requires authentication");
  }
  return errors;
};

const omitNullValues = (input: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null)
  );

const parseProjectMeta = (input: Record<string, unknown>) => {
  const result = projectMeta.partial().safeParse(omitNullValues(input));
  if (result.success === false) {
    return throwBuilderRuntimeError("BAD_REQUEST", result.error.message);
  }
  if (typeof result.data.contactEmail === "string") {
    const contactEmailError = validateContactEmail(result.data.contactEmail);
    if (contactEmailError !== undefined) {
      return throwBuilderRuntimeError("BAD_REQUEST", contactEmailError);
    }
  }
  if (typeof result.data.auth === "string") {
    const authError = validateProjectAuth(result.data.auth);
    if (authError !== undefined) {
      return throwBuilderRuntimeError("BAD_REQUEST", authError);
    }
  }
  const values: Settable<ProjectMeta> = { ...result.data };
  for (const [name, value] of Object.entries(input)) {
    if (value === null && projectMetaKeys.has(name)) {
      values[name as keyof ProjectMeta] = null;
    }
  }
  return values;
};

const parseCompilerSettings = (input: Record<string, unknown>) => {
  const result = compilerSettings.partial().safeParse(omitNullValues(input));
  if (result.success === false) {
    return throwBuilderRuntimeError("BAD_REQUEST", result.error.message);
  }
  const values: Settable<CompilerSettings> = { ...result.data };
  for (const [name, value] of Object.entries(input)) {
    if (value === null && compilerSettingKeys.has(name)) {
      values[name as keyof CompilerSettings] = null;
    }
  }
  return values;
};

export const getProjectSettings = (state: Pick<BuilderState, "pages">) => {
  const pages = getRequiredPages(state);
  return {
    meta: pages.meta ?? {},
    compiler: pages.compiler ?? {},
    redirects: pages.redirects ?? [],
  };
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
    const next = omitNullValues(values);
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
    patches.push({
      op: exists ? "replace" : "add",
      path: [...basePath, name],
      value,
    });
  }
};

export const updateProjectSettings = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof projectSettingsUpdateInput>
) => {
  const pages = getRequiredPages(state);
  const patches: BuilderPatchChange["patches"] = [];
  if (input.meta !== undefined) {
    const values = parseProjectMeta(input.meta);
    pushObjectFieldPatches({
      patches,
      basePath: ["meta"],
      current: pages.meta,
      values,
    });
  }
  if (input.compiler !== undefined) {
    const values = parseCompilerSettings(input.compiler);
    pushObjectFieldPatches({
      patches,
      basePath: ["compiler"],
      current: pages.compiler,
      values,
    });
  }
  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([{ namespace: "pages", patches }]),
    result: { updated: true },
    invalidatesNamespaces: ["pages"],
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

export const listRedirects = (state: Pick<BuilderState, "pages">) => ({
  redirects: getRequiredPages(state).redirects ?? [],
});

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

export const listBreakpoints = (state: Pick<BuilderState, "breakpoints">) => ({
  breakpoints: Array.from(getRequiredBreakpoints(state).values()),
});

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
  const canHaveOnlyOneBaseBreakpoint =
    value.condition === undefined && isBaseBreakpoint(value);
  if (
    canHaveOnlyOneBaseBreakpoint &&
    Array.from(breakpoints.values()).some(
      (breakpoint) =>
        breakpoint.condition === undefined && isBaseBreakpoint(breakpoint)
    )
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
  if (current.condition === undefined && isBaseBreakpoint(current)) {
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
  if (value.condition === undefined && isBaseBreakpoint(value)) {
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
  if (
    breakpoint !== undefined &&
    breakpoint.condition === undefined &&
    isBaseBreakpoint(breakpoint)
  ) {
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
