import { z } from "zod";

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
    type: z.literal("asset"),
    value: z.string(),
  }),
  z.object({
    ...baseProp,
    type: z.literal("string[]"),
    value: z.array(z.string()),
  }),
]);

export type Prop = z.infer<typeof Prop>;

export const PropsList = z.array(Prop);

export type PropsList = z.infer<typeof PropsList>;

export const Props = z.map(PropId, Prop);

export type Props = z.infer<typeof Props>;
