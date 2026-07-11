import { z } from "zod";
import { builderNamespaces, type BuilderNamespace } from "./namespaces";

const builderPatchPath = z.array(z.union([z.string(), z.number()]));

export type BuilderPatchPath = Array<string | number>;

export type BuilderPatch =
  | { op: "add"; path: BuilderPatchPath; value: unknown }
  | { op: "replace"; path: BuilderPatchPath; value: unknown }
  | { op: "remove"; path: BuilderPatchPath };

const requireBuilderPatchValue = (
  patch: { value?: unknown },
  context: z.RefinementCtx
) => {
  if (Object.hasOwn(patch, "value") === false) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["value"],
      message: "Required",
    });
  }
};

export const builderPatchSchema: z.ZodType<BuilderPatch, unknown> = z
  .union([
    z
      .object({
        op: z.literal("add"),
        path: builderPatchPath,
        value: z.unknown(),
      })
      .superRefine(requireBuilderPatchValue),
    z
      .object({
        op: z.literal("replace"),
        path: builderPatchPath,
        value: z.unknown(),
      })
      .superRefine(requireBuilderPatchValue),
    z.object({
      op: z.literal("remove"),
      path: builderPatchPath,
    }),
  ])
  .transform((patch): BuilderPatch => patch as BuilderPatch);

const pageGeneratedRecordPaths = new Set(["pages", "folders", "pageTemplates"]);
const generatedRecordNamespaces = new Set<BuilderNamespace>(
  builderNamespaces.filter(
    (namespace) =>
      namespace !== "pages" &&
      namespace !== "projectSettings" &&
      namespace !== "marketplaceProduct"
  )
);

const isGeneratedRecordCreatePatch = (
  namespace: BuilderNamespace,
  patch: BuilderPatch
): boolean => {
  if (patch.op !== "add") {
    return false;
  }
  if (generatedRecordNamespaces.has(namespace)) {
    return patch.path.length <= 1;
  }
  if (namespace !== "pages") {
    return false;
  }
  return (
    patch.path.length === 0 ||
    (patch.path.length <= 2 &&
      typeof patch.path[0] === "string" &&
      pageGeneratedRecordPaths.has(patch.path[0]))
  );
};

const getPreservedGeneratedRecordId = (patch: BuilderPatch) => {
  if (
    patch.op !== "replace" ||
    typeof patch.value !== "object" ||
    patch.value === null ||
    Array.isArray(patch.value)
  ) {
    return;
  }
  const id = (patch.value as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
};

const isGeneratedRecordContainerReplacePatch = (
  namespace: BuilderNamespace,
  patch: BuilderPatch
): boolean => {
  if (patch.op !== "replace") {
    return false;
  }
  if (generatedRecordNamespaces.has(namespace)) {
    if (patch.path.length === 0) {
      return true;
    }
    const [recordId] = patch.path;
    if (patch.path.length === 1 && typeof recordId === "string") {
      return getPreservedGeneratedRecordId(patch) !== recordId;
    }
    return false;
  }
  if (namespace !== "pages") {
    return false;
  }
  if (patch.path.length === 0) {
    return true;
  }
  if (
    patch.path.length === 2 &&
    typeof patch.path[0] === "string" &&
    pageGeneratedRecordPaths.has(patch.path[0]) &&
    typeof patch.path[1] === "string"
  ) {
    return getPreservedGeneratedRecordId(patch) !== patch.path[1];
  }
  return (
    patch.path.length === 1 &&
    typeof patch.path[0] === "string" &&
    pageGeneratedRecordPaths.has(patch.path[0])
  );
};

const isGeneratedRecordWritePatch = (
  namespace: BuilderNamespace,
  patch: BuilderPatch
): boolean => {
  if (patch.op === "add") {
    return isGeneratedRecordCreatePatch(namespace, patch);
  }
  return isGeneratedRecordContainerReplacePatch(namespace, patch);
};

const isGeneratedRecordIdFieldPatch = (
  namespace: BuilderNamespace,
  patch: BuilderPatch
) => {
  if (patch.op !== "add" && patch.op !== "replace" && patch.op !== "remove") {
    return false;
  }
  if (generatedRecordNamespaces.has(namespace)) {
    return patch.path.length === 2 && patch.path[1] === "id";
  }
  if (namespace !== "pages") {
    return false;
  }
  return (
    patch.path.length === 3 &&
    typeof patch.path[0] === "string" &&
    pageGeneratedRecordPaths.has(patch.path[0]) &&
    patch.path[2] === "id"
  );
};

export const builderPatchChangeSchema: z.ZodType<BuilderPatchChange, unknown> =
  z
    .object({
      namespace: z.enum(builderNamespaces),
      patches: z.array(builderPatchSchema),
    })
    .superRefine((change, context) => {
      for (const [index, patch] of change.patches.entries()) {
        if (isGeneratedRecordWritePatch(change.namespace, patch)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["patches", index, "path"],
            message:
              `Raw patches cannot create or replace generated record collections or records in ` +
              `namespace "${change.namespace}". Use semantic operations so Webstudio generates and preserves runtime ids.`,
          });
          continue;
        }
        if (isGeneratedRecordIdFieldPatch(change.namespace, patch) === false) {
          continue;
        }
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["patches", index, "path"],
          message:
            `Raw patches cannot change record id fields in namespace ` +
            `"${change.namespace}". Use semantic operations so Webstudio preserves system ids.`,
        });
      }
    });

export const builderPatchTransactionSchema: z.ZodType<
  BuilderPatchTransaction,
  unknown
> = z.object({
  id: z.string().min(1),
  payload: z.array(builderPatchChangeSchema),
});

export type BuilderPatchChange = {
  namespace: (typeof builderNamespaces)[number];
  patches: BuilderPatch[];
};

export type BuilderPatchTransaction = {
  id: string;
  payload: BuilderPatchChange[];
};

export const hasGeneratedRecordWritePatch = (
  payload: readonly BuilderPatchChange[]
) =>
  payload.some((change) =>
    change.patches.some((patch) =>
      isGeneratedRecordWritePatch(change.namespace, patch)
    )
  );

export const compactBuilderPatchPayload = (
  payload: BuilderPatchChange[]
): BuilderPatchChange[] =>
  payload.flatMap((change) => (change.patches.length === 0 ? [] : [change]));
