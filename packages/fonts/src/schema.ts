import { z } from "zod";
import { styles } from "./get-font-data";

export const FontMeta = z.object({
  family: z.string(),
  style: z.enum(styles),
  weight: z.number(),
});
export type FontMeta = z.infer<typeof FontMeta>;
