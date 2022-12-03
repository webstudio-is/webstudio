import { z } from "zod";
import { Asset } from "@webstudio-is/asset-uploader";

const baseUserProps = {
  id: z.string(),
  prop: z.string(),
  required: z.optional(z.boolean()),
};

export const UserProp = z.discriminatedUnion("type", [
  z.object({
    ...baseUserProps,
    type: z.literal("number"),
    value: z.number(),
  }),
  z.object({
    ...baseUserProps,
    type: z.literal("string"),
    value: z.string(),
  }),
  z.object({
    ...baseUserProps,
    type: z.literal("boolean"),
    value: z.boolean(),
  }),
  z.object({
    ...baseUserProps,
    type: z.literal("asset"),
    value: Asset,
  }),
]);

export const UserProps = z.array(UserProp);

export type UserProp = z.infer<typeof UserProp>;
