import { z } from "zod";

export const contentBlockSourceProp = "src";

export const contentBlockSource = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("asset"),
    assetId: z.string().min(1),
  }),
  z.strictObject({
    type: z.literal("expression"),
    value: z.string().min(1),
  }),
]);

export type ContentBlockSource = z.infer<typeof contentBlockSource>;

export const contentBlockExternalContentIdentity = z.strictObject({
  blockInstanceId: z.string().min(1),
  assetId: z.string().min(1),
  revision: z.string().min(1),
  contentRef: z.string().min(1),
  format: z.literal("mdx"),
  renderScope: z.string().min(1),
});

export type ContentBlockExternalContentIdentity = z.infer<
  typeof contentBlockExternalContentIdentity
>;

const sourcePoint = z.strictObject({
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  offset: z.number().int().nonnegative().optional(),
});

export const contentBlockSourceRange = z.strictObject({
  start: sourcePoint,
  end: sourcePoint,
});

export type ContentBlockSourceRange = z.infer<typeof contentBlockSourceRange>;

const diagnosticContext = {
  blockInstanceId: z.string().min(1),
  assetId: z.string().min(1).optional(),
  contentRef: z.string().min(1).optional(),
  renderScope: z.string().min(1).optional(),
  sourceRange: contentBlockSourceRange.optional(),
};

export const contentBlockDiagnostic = z.discriminatedUnion("code", [
  z.strictObject({
    ...diagnosticContext,
    code: z.literal("invalid-mdx"),
    severity: z.literal("error"),
    message: z.string().min(1),
  }),
  z.strictObject({
    ...diagnosticContext,
    code: z.literal("unsafe-mdx"),
    severity: z.literal("error"),
    nodeType: z.string().min(1),
    reason: z.string().min(1),
  }),
  z.strictObject({
    ...diagnosticContext,
    code: z.literal("unresolved-template"),
    severity: z.literal("warning"),
    templateName: z.string().min(1),
  }),
  z.strictObject({
    ...diagnosticContext,
    code: z.literal("ignored-template-prop"),
    severity: z.literal("warning"),
    templateName: z.string().min(1),
    propName: z.string().min(1),
    reason: z.enum(["unknown", "incompatible", "design-only", "stale"]),
  }),
  z.strictObject({
    ...diagnosticContext,
    code: z.literal("stale-revision"),
    severity: z.literal("error"),
    expectedRevision: z.string().min(1),
    actualRevision: z.string().min(1).optional(),
  }),
  z.strictObject({
    ...diagnosticContext,
    code: z.literal("changed-binding"),
    severity: z.literal("error"),
    loadedAssetId: z.string().min(1),
    resolvedAssetId: z.string().min(1),
  }),
  z.strictObject({
    ...diagnosticContext,
    code: z.literal("pending-writes"),
    severity: z.literal("error"),
    pendingMutationCount: z.number().int().positive(),
  }),
  z.strictObject({
    ...diagnosticContext,
    code: z.literal("authorization-failed"),
    severity: z.literal("error"),
    operation: z.enum(["read", "write"]),
  }),
  z.strictObject({
    ...diagnosticContext,
    code: z.literal("partial-recovery"),
    severity: z.literal("error"),
    completedStorageRoots: z.array(z.string().min(1)),
    failedStorageRoots: z.array(z.string().min(1)).min(1),
  }),
]);

export type ContentBlockDiagnostic = z.infer<typeof contentBlockDiagnostic>;
