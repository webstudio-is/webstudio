import { z } from "zod";
import { Asset } from "@webstudio-is/asset-uploader";

const UserPropDb = z.object({
  id: z.string(),
  prop: z.string(),
  value: z.union([z.string(), z.boolean(), z.number()]),
  assetId: z.optional(z.string()),
  required: z.optional(z.boolean()),
});
export type UserPropDb = z.infer<typeof UserPropDb>;

export const UserDbProps = z.array(UserPropDb);
export type UserDbProps = z.infer<typeof UserDbProps>;

export const UserProp = z.object({
  id: z.string(),
  prop: z.string(),
  value: z.union([z.string(), z.boolean(), z.number()]),
  asset: Asset.optional(),
  required: z.optional(z.boolean()),
});
export type UserProp = z.infer<typeof UserProp>;

export const UserProps = z.array(UserProp);
export type UserProps = z.infer<typeof UserProps>;
