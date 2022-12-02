import { z } from "zod";
import { styles } from "./font-data";

export const FontFormat = z.union([
  z.literal("ttf"),
  z.literal("woff"),
  z.literal("woff2"),
  z.literal("otf"),
]);
export type FontFormat = z.infer<typeof FontFormat>;

export const FontMeta = z.object({
  family: z.string(),
  style: z.enum(styles),
  weight: z.number(),
});
export type FontMeta = z.infer<typeof FontMeta>;
