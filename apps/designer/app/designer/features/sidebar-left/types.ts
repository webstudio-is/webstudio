import { panels } from "./panels";
import { z } from "zod";
import { NodeOnDiskFile } from "@remix-run/node";

export type TabName = keyof typeof panels | "none";

const SingleImageInUpload = z.instanceof(NodeOnDiskFile);

export const ImagesUpload = z.array(SingleImageInUpload);

export type ImagesUpload = z.infer<typeof ImagesUpload>;
export type SingleImageInUpload = z.infer<typeof SingleImageInUpload>;
