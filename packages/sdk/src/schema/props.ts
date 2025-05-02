import { z } from "zod";
import { animationActionSchema } from "./animation-schema";

const PropId = z.string();

const baseProp = {
  id: PropId,
  instanceId: z.string(),
  name: z.string(),
  required: z.optional(z.boolean()),
};

export const Prop = z.union([
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
    value: animationActionSchema,
  }),
]);

export type Prop = z.infer<typeof Prop>;

export const Props = z.map(PropId, Prop);

export type Props = z.infer<typeof Props>;
