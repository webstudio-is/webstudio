import { z } from "zod";
import type { Asset } from "@webstudio-is/asset-uploader";

const UserPropDb = z.object({
  id: z.string(),
  prop: z.string(),
  value: z.union([z.string(), z.boolean()]),
  assetId: z.optional(z.string()),
  required: z.optional(z.boolean()),
});

export const UserDbProps = z.array(UserPropDb);

const UserUserProp = z
  .object({
    id: z.string(),
    prop: z.string(),
    value: z.union([z.string(), z.boolean()]),
    // We are not interested in Props data does any other props on asset exists
    asset: z.optional(z.object({ id: z.string() })),
    required: z.optional(z.boolean()),
  })
  .transform(({ id, prop, value, asset, required }) => {
    // Check with infer that we are transforming to UserPropDb
    const res: z.infer<typeof UserPropDb> = {
      id,
      prop,
      value,
      assetId: asset?.id,
      required,
    };
    return res;
  });

export const UserUserProps = z.array(UserUserProp);

export type UserProp = {
  id: string;
  prop: string;
  value: string | boolean;
  asset?: Asset;
  required?: boolean | undefined;
};
