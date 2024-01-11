import { z } from "zod";

export const TextChild = z.object({
  type: z.literal("text"),
  value: z.string(),
});

export type TextChild = z.infer<typeof TextChild>;

const InstanceId = z.string();

export const IdChild = z.object({
  type: z.literal("id"),
  value: InstanceId,
});
export type IdChild = z.infer<typeof IdChild>;

export const ExpressionChild = z.object({
  type: z.literal("expression"),
  value: z.string(),
});
export type ExpressionChild = z.infer<typeof ExpressionChild>;

export const Instance = z.object({
  type: z.literal("instance"),
  id: InstanceId,
  component: z.string(),
  label: z.string().optional(),
  children: z.array(z.union([IdChild, TextChild, ExpressionChild])),
});

export type Instance = z.infer<typeof Instance>;

export const Instances = z.map(InstanceId, Instance);

export type Instances = z.infer<typeof Instances>;
