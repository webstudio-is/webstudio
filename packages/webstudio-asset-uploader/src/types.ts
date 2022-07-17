import { z } from "zod";
import { NodeOnDiskFile } from "@remix-run/node";

const SingleImageInUpload = z.instanceof(NodeOnDiskFile);

export const ImagesUpload = z.array(SingleImageInUpload);

export type ImagesUpload = z.infer<typeof ImagesUpload>;
export type SingleImageInUpload = z.infer<typeof SingleImageInUpload>;

export const ImagesUploadedSuccess = z.object({
  Location: z.string(),
});
export type ImagesUploadedSuccess = z.infer<typeof ImagesUploadedSuccess>;
