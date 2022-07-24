import { panels } from "./panels";

export type TabName = keyof typeof panels | "none";

export type UploadingAsset = {
  id: string;
  uploading: boolean;
  name: string;
  path: string;
  alt: string;
};
