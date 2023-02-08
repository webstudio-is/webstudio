import { z } from "zod";
import { Asset } from "@webstudio-is/asset-uploader";

const PropId = z.string();

const baseProp = {
  id: PropId,
  instanceId: z.string(),
  name: z.string(),
  required: z.optional(z.boolean()),
};

const SharedProp = z.union([
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
]);

export const StoredProp = z.union([
  SharedProp,
  z.object({
    ...baseProp,
    type: z.literal("asset"),
    // asset.id is stored in database
    value: z.string(),
  }),
]);

export type StoredProp = z.infer<typeof StoredProp>;

export const StoredProps = z.array(StoredProp);

export type StoredProps = z.infer<typeof StoredProps>;

export const Prop = z.union([
  SharedProp,
  z.object({
    ...baseProp,
    type: z.literal("asset"),
    value: Asset,
  }),
]);

export type Prop = z.infer<typeof Prop>;

export const Props = z.map(PropId, Prop);

export type Props = z.infer<typeof Props>;
