import { z } from "zod";
import { Asset } from "@webstudio-is/asset-uploader";

// @todo move zod out of sdk
// @todo clean db make objects .strict(),
// as of now we already have asset and value simulateneously in db
// and instead of strict error zod will ignore value
const UserDbProp = z.union([
  z.object({
    id: z.string(),
    prop: z.string(),
    assetId: z.string(),
    required: z.optional(z.boolean()),
  }),
  z.object({
    id: z.string(),
    prop: z.string(),
    value: z.union([z.string(), z.boolean(), z.number()]),
    required: z.optional(z.boolean()),
  }),
]);

export const UserDbProps = z.array(UserDbProp);

export const UserDbPropsStrict = z.array(UserDbProp);

export type UserDbProp = z.infer<typeof UserDbProp>;

// @todo move zod out of sdk
export const UserProp = z.union([
  z.object({
    id: z.string(),
    prop: z.string(),
    value: z.union([z.string(), z.boolean(), z.number()]),
    required: z.optional(z.boolean()),
  }),
  z.object({
    id: z.string(),
    prop: z.string(),
    asset: Asset,
    required: z.optional(z.boolean()),
  }),
]);

export const UserProps = z.array(UserProp);
export type UserProp = z.infer<typeof UserProp>;
