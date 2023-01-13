import { z } from "zod";
import { ComponentName, getComponentNames } from "../components";

// This should be used when passing a lot of data is potentially costly.
// For example, when passing data from an iframe.
export type BaseInstance = {
  id: string;
  component: ComponentName;
};

export type Text = {
  type: "text";
  value: string;
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

export const Text = z.lazy(() =>
  z.object({
    type: z.literal("text"),
    value: z.string(),
  })
);

export const Instance: z.ZodType<Instance> = z.lazy(() =>
  z.object({
    type: z.literal("instance"),
    id: z.string(),
    component: z.enum(getComponentNames() as [ComponentName]),
    children: z.array(z.union([Instance, Text])),
  })
);
