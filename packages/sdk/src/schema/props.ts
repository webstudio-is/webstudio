import { z } from "zod";
import { animationAction } from "./animation-schema";

const propId = z.string();

const baseProp = {
  id: propId,
  instanceId: z.string(),
  name: z.string(),
  required: z.optional(z.boolean()),
};

export const prop = z.union([
  z.object({
    ...baseProp,
    type: z.literal("number"),
    value: z.number(),
  }),
  z.object({
    ...baseProp,
    type: z.literal("string"),
    value: z.string(),
  }),
  z.object({
    ...baseProp,
    type: z.literal("boolean"),
    value: z.boolean(),
  }),
  z.object({
    ...baseProp,
    type: z.literal("json"),
    value: z.unknown(),
  }),
  z.object({
    ...baseProp,
    type: z.literal("asset"),
    value: z.string(), // asset id
  }),
  z.object({
    ...baseProp,
    type: z.literal("page"),
    value: z.union([
      z.string(), // page id
      z.object({
        pageId: z.string(),
        instanceId: z.string(),
      }),
    ]),
  }),
  z.object({
    ...baseProp,
    type: z.literal("string[]"),
    value: z.array(z.string()),
  }),
  z.object({
    ...baseProp,
    type: z.literal("parameter"),
    // data source id
    value: z.string(),
  }),
  z.object({
    ...baseProp,
    type: z.literal("resource"),
    // resource id
    value: z.string(),
  }),
  z.object({
    ...baseProp,
    type: z.literal("expression"),
    // expression code
    value: z.string(),
  }),
  z.object({
    ...baseProp,
    type: z.literal("action"),
    value: z.array(
      z.object({
        type: z.literal("execute"),
        args: z.array(z.string()),
        code: z.string(),
      })
    ),
  }),
  z.object({
    ...baseProp,
    type: z.literal("animationAction"),
    value: animationAction,
  }),
]);

export type Prop = z.infer<typeof prop>;

export const props = z.map(propId, prop);

export type Props = z.infer<typeof props>;
