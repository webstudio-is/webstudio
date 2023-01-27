import { z } from "zod";
import { Asset } from "@webstudio-is/asset-uploader";

const basePropsItem = {
  id: z.string(),
  instanceId: z.string(),
  name: z.string(),
  required: z.optional(z.boolean()),
};

const SharedPropsItem = z.union([
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
]);

export const StoredPropsItem = z.union([
  SharedPropsItem,
  z.object({
    ...basePropsItem,
    type: z.literal("asset"),
    // asset.id is stored in database
    value: z.string(),
  }),
]);

export type StoredPropsItem = z.infer<typeof StoredPropsItem>;

export const StoredProps = z.array(StoredPropsItem);

export type StoredProps = z.infer<typeof StoredProps>;

export const PropsItem = z.union([
  SharedPropsItem,
  z.object({
    ...basePropsItem,
    type: z.literal("asset"),
    value: Asset,
  }),
]);

export type PropsItem = z.infer<typeof PropsItem>;

export const Props = z.array(PropsItem);

export type Props = z.infer<typeof Props>;
