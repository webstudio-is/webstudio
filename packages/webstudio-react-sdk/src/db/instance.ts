import { z } from "zod";
import * as components from "../components";
import { type CssRule, CssRuleSchema } from "../css";

export type Instance = {
  id: string;
  component: keyof typeof components;
  children: Array<Instance | string>;
  cssRules: Array<CssRule>;
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
