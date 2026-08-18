import { z } from "zod";

export const textChildValue = z.string();

export const textChild = z.object({
  type: z.literal("text"),
  value: textChildValue,
  placeholder: z.boolean().optional(),
});

export type TextChild = z.infer<typeof textChild>;

const instanceId = z.string();
export const instanceComponent = z.string().min(1);
export const instanceTag = z
  .string()
  .min(1, "Tag cannot be empty")
  .describe(
    "Optional HTML tag override for component rendering. Omit for component defaults; never pass an empty string."
  );
export const instanceAttributes = z.object({
  component: instanceComponent,
  tag: instanceTag.optional(),
  label: z.string().optional(),
});

export const instanceCreateInput = instanceAttributes.partial({
  component: true,
});

export const instanceFilterInput = instanceAttributes
  .pick({
    component: true,
    tag: true,
  })
  .partial();

export const idChild = z.object({
  type: z.literal("id"),
  value: instanceId,
});
export type IdChild = z.infer<typeof idChild>;

export const expressionChild = z.object({
  type: z.literal("expression"),
  value: z.string(),
});
export type ExpressionChild = z.infer<typeof expressionChild>;

export const instanceChild = z.union([idChild, textChild, expressionChild]);

export const instance = z.object({
  type: z.literal("instance"),
  id: instanceId,
  component: instanceAttributes.shape.component,
  tag: instanceAttributes.shape.tag,
  label: instanceAttributes.shape.label,
  children: z.array(instanceChild),
});

export type Instance = z.infer<typeof instance>;

export const instances = z.map(instanceId, instance);

export type Instances = z.infer<typeof instances>;
