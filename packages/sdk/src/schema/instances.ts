import { z } from "zod";

export const TextChild = z.object({
  type: z.literal("text"),
  value: z.string(),
  placeholder: z.boolean().optional(),
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

export const InstanceChild = z.union([IdChild, TextChild, ExpressionChild]);

export const Instance = z.object({
  type: z.literal("instance"),
  id: InstanceId,
  component: z.string(),
  label: z.string().optional(),
  children: z.array(InstanceChild),
});

export type Instance = z.infer<typeof Instance>;

export const Instances = z.map(InstanceId, Instance);

export type Instances = z.infer<typeof Instances>;

export const MatcherRelation = z.union([
  z.literal("ancestor"),
  z.literal("parent"),
  z.literal("self"),
  z.literal("child"),
  z.literal("descendant"),
]);

export type MatcherRelation = z.infer<typeof MatcherRelation>;

export const MatcherOperation = z.object({
  $eq: z.string().optional(),
  $neq: z.string().optional(),
  $in: z.array(z.string()).optional(),
  $nin: z.array(z.string()).optional(),
});

export type MatcherOperation = z.infer<typeof MatcherOperation>;

export const Matcher = z.object({
  relation: MatcherRelation,
  component: MatcherOperation.optional(),
  tag: MatcherOperation.optional(),
});

export type Matcher = z.infer<typeof Matcher>;

export const Matchers = z.union([Matcher, z.array(Matcher)]);

export type Matchers = z.infer<typeof Matchers>;
