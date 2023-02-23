import { z } from "zod";

// This should be used when passing a lot of data is potentially costly.
// For example, when passing data from an iframe.
export type BaseInstance = {
  id: string;
  component: string;
};

export type Instance = BaseInstance & {
  type: "instance";
  children: Array<Instance | Text>;
};

export const toBaseInstance = (instance: Instance): BaseInstance => {
  return {
    id: instance.id,
    component: instance.component,
  };
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
    children: z.array(z.union([Instance, Text])),
  })
);
