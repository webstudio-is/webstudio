import { z } from "zod";

export type Instance = {
  type: "instance";
  id: string;
  component: string;
  label?: string;
  children: Array<Instance | Text>;
};

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

export const InstancesItem = z.object({
  type: z.literal("instance"),
  id: InstanceId,
  component: z.string(),
  label: z.string().optional(),
  children: z.array(z.union([Id, Text])),
});

export type InstancesItem = z.infer<typeof InstancesItem>;

export const InstancesList = z.array(InstancesItem);

export type InstancesList = z.infer<typeof InstancesList>;

export const Instances = z.map(InstanceId, InstancesItem);

export type Instances = z.infer<typeof Instances>;

export const Instance: z.ZodType<Instance> = z.lazy(() =>
  z.object({
    type: z.literal("instance"),
    id: z.string(),
    component: z.string(),
    label: z.string().optional(),
    children: z.array(z.union([Instance, Text])),
  })
);
