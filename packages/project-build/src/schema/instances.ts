import { z } from "zod";

export const Text = z.object({
  type: z.literal("text"),
  value: z.string(),
});

export type Text = z.infer<typeof Text>;

const InstanceId = z.string();

export const Id = z.object({
  type: z.literal("id"),
  value: InstanceId,
});
export type Id = z.infer<typeof Id>;

export const Instance = z.object({
  type: z.literal("instance"),
  id: InstanceId,
  component: z.string(),
  label: z.string().optional(),
  children: z.array(z.union([Id, Text])),
});

export type Instance = z.infer<typeof Instance>;

export const InstancesList = z.array(Instance);

export type InstancesList = z.infer<typeof InstancesList>;

export const Instances = z.map(InstanceId, Instance);

export type Instances = z.infer<typeof Instances>;
