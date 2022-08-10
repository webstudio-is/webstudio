import { z } from "zod";
import * as components from "../components";
import { type CssRule, CssRuleSchema } from "../css";

// This should be used when passing a lot of data is potentially costly.
// For example, when passing data from an iframe.
export type BaseInstance = {
  id: string;
  component: keyof typeof components;
  cssRules: Array<CssRule>;
};

export type Instance = BaseInstance & {
  children: Array<Instance | string>;
};

export const toBaseInstance = (instance: Instance): BaseInstance => {
  return {
    id: instance.id,
    component: instance.component,
    cssRules: instance.cssRules,
  };
};

export const InstanceSchema = z.lazy(
  () =>
    z.object({
      id: z.string(),
      component: z.string(),
      children: z.array(z.union([InstanceSchema, z.string()])),
      cssRules: z.array(CssRuleSchema),
    })
  // @todo can't figure out how to make component to be z.enum(Object.keys(components))
) as z.ZodType<Instance>;
