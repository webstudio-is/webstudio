import { CssRule } from "@webstudio-is/css-data";
import { z } from "zod";
import { ComponentName } from "../components";

// This should be used when passing a lot of data is potentially costly.
// For example, when passing data from an iframe.
export type BaseInstance = {
  id: string;
  component: ComponentName;
  cssRules: Array<CssRule>;
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
    cssRules: instance.cssRules,
  };
};

export const Text = z.lazy(() =>
  z.object({
    type: z.literal("text"),
    value: z.string(),
  })
);

export const Instance = z.lazy(
  () =>
    z.object({
      type: z.literal("instance"),
      id: z.string(),
      component: z.string(),
      children: z.array(z.union([Instance, Text])),
      cssRules: z.array(CssRule),
    })
  // @todo can't figure out how to make component to be z.enum(Object.keys(components))
) as z.ZodType<Instance>;
