import { z } from "zod";

const basePropsItem = {
  id: z.string(),
  instanceId: z.string(),
  name: z.string(),
  required: z.optional(z.boolean()),
};

export const PropsItem = z.discriminatedUnion("type", [
  z.object({
    ...basePropsItem,
    type: z.literal("number"),
    value: z.number(),
  }),
  z.object({
    ...basePropsItem,
    type: z.literal("string"),
    value: z.string(),
  }),
  z.object({
    ...basePropsItem,
    type: z.literal("boolean"),
    value: z.boolean(),
  }),
  z.object({
    ...basePropsItem,
    type: z.literal("asset"),
    // In database we hold asset.id
    value: z.string(),
  }),
]);

export type PropsItem = z.infer<typeof PropsItem>;

export const Props = z.array(PropsItem);

export type Props = z.infer<typeof Props>;
