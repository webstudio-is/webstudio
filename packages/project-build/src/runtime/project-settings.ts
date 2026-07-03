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
} from "@webstudio-is/sdk";
import { z } from "zod";
import {
  compactBuilderPatchPayload,
  type BuilderPatchChange,
} from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import { hasReachedBreakpointLimit, isBaseBreakpoint } from "./breakpoints";
import { throwBuilderRuntimeError } from "./errors";
import { createRuntimeMutation } from "./mutation";
import { getRequiredPages } from "./pages";

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
  meta: z.record(z.unknown()).optional(),
  compiler: z.record(z.unknown()).optional(),
});

const projectMetaKeys: ReadonlySet<string> = new Set(
  projectMeta.keyof().options
);
const compilerSettingKeys: ReadonlySet<string> = new Set(
  compilerSettings.keyof().options
);

const omitNullValues = (input: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null)
  );

const parseProjectMeta = (input: Record<string, unknown>) => {
  const result = projectMeta.partial().safeParse(omitNullValues(input));
  if (result.success === false) {
    return throwBuilderRuntimeError("BAD_REQUEST", result.error.message);
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

const findRedirectIndex = (
  redirects: NonNullable<ReturnType<typeof getRequiredPages>["redirects"]>,
  oldPath: string
) => redirects.findIndex((redirect) => redirect.old === oldPath);

const parseRedirect = (input: PageRedirect) => {
  const result = pageRedirect.safeParse(input);
  if (result.success === false) {
    return throwBuilderRuntimeError("BAD_REQUEST", result.error.message);
  }
  return result.data;
};

export const createRedirect = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof redirectCreateInput>
) => {
  const pages = getRequiredPages(state);
  const value = parseRedirect(input);
  const redirects = pages.redirects ?? [];
  if (findRedirectIndex(redirects, value.old) !== -1) {
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
    findRedirectIndex(redirects, input.values.old) !== -1
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

export const listBreakpoints = (state: Pick<BuilderState, "breakpoints">) => ({
  breakpoints: Array.from(getRequiredBreakpoints(state).values()),
});

export const breakpointFieldsInput = z.object({
  id: z.string(),
  label: z.string(),
  minWidth: z.number().optional(),
  maxWidth: z.number().optional(),
  condition: z.string().optional(),
});

export const breakpointUpdateFieldsInput = z.object({
  label: z.string().optional(),
  minWidth: z.number().nullable().optional(),
  maxWidth: z.number().nullable().optional(),
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
  input: z.infer<typeof breakpointCreateInput>
) => {
  const breakpoints = getRequiredBreakpoints(state);
  if (breakpoints.has(input.id)) {
    return throwBuilderRuntimeError("CONFLICT", "Breakpoint already exists");
  }
  const value = parseBreakpoint(input);
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
        patches: [{ op: "add", path: [value.id], value }],
      },
    ],
    result: { breakpointId: value.id },
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
