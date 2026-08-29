import { z } from "zod";
import { prop } from "./props";

export const contentBlockSourceProp = "src";
export const contentBlockDocumentProp = "document";

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

export const contentBlockSourcePropSchema = prop.refine(
  (value) =>
    value.name === contentBlockSourceProp &&
    (value.type === "asset" || value.type === "expression") &&
    value.value.length > 0
);

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

const contentBlockSourceRange = z.strictObject({
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
    severity: z.literal("warning"),
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
]);

export type ContentBlockDiagnostic = z.infer<typeof contentBlockDiagnostic>;
