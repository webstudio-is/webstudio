import { z } from "zod";
import { builderNamespaces } from "./namespaces";

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

export const builderPatchSchema: z.ZodType<
  BuilderPatch,
  z.ZodTypeDef,
  unknown
> = z
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

export const builderPatchChangeSchema: z.ZodType<
  BuilderPatchChange,
  z.ZodTypeDef,
  unknown
> = z.object({
  namespace: z.enum(builderNamespaces),
  patches: z.array(builderPatchSchema),
});

export const builderPatchTransactionSchema: z.ZodType<
  BuilderPatchTransaction,
  z.ZodTypeDef,
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

export const compactBuilderPatchPayload = (
  payload: BuilderPatchChange[]
): BuilderPatchChange[] =>
  payload.flatMap((change) => (change.patches.length === 0 ? [] : [change]));
