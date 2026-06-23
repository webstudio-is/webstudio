import { z } from "zod";

export const textChild = z.object({
  type: z.literal("text"),
  value: z.string(),
  placeholder: z.boolean().optional(),
});

export type TextChild = z.infer<typeof textChild>;

const instanceId = z.string();

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
  component: z.string(),
  tag: z.string().optional(),
  label: z.string().optional(),
  children: z.array(instanceChild),
});

export type Instance = z.infer<typeof instance>;

export const instances = z.map(instanceId, instance);

export type Instances = z.infer<typeof instances>;
