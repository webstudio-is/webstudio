import { panels } from "./panels";
import { z } from "zod";

export type TabName = keyof typeof panels | "none";

const SingleImageInUpload = z.object({
  name: z.string(),
  type: z.string(),
});

export const ImagesUpload = z.array(SingleImageInUpload);

export type ImagesUpload = z.infer<typeof ImagesUpload>;
export type SingleImageInUpload = z.infer<typeof SingleImageInUpload>;
