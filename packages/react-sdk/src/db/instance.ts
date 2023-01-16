import { z } from "zod";
import { type ComponentName, getComponentNames } from "../components";

// This should be used when passing a lot of data is potentially costly.
// For example, when passing data from an iframe.
export type BaseInstance = {
  id: string;
  component: ComponentName;
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

export const Id = z.object({
  type: z.literal("id"),
  value: z.string(),
});
export type Id = z.infer<typeof Id>;

export const InstancesItem = z.object({
  type: z.literal("instance"),
  id: z.string(),
  component: z.enum(getComponentNames() as [ComponentName]),
  children: z.array(z.union([Id, Text])),
});

export type InstancesItem = z.infer<typeof InstancesItem>;

export const Instances = z.array(InstancesItem);

export type Instances = z.infer<typeof Instances>;

export const Instance: z.ZodType<Instance> = z.lazy(() =>
  z.object({
    type: z.literal("instance"),
    id: z.string(),
    component: z.enum(getComponentNames() as [ComponentName]),
    children: z.array(z.union([Instance, Text])),
  })
);
