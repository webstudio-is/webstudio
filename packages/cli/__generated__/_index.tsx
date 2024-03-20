/**
 * The only intent of this file is to support typings inside ../templates/route-template for easier development.
 **/
import type { ImageAsset, FontAsset } from "@webstudio-is/sdk";
import type { PageData } from "../templates/defaults/__templates__/route-template";

export const imageAssets: ImageAsset[] = [];

export const pageData: PageData = {
  project: {
    siteName: "",
    faviconAssetId: "",
    code: "",
  },
};

export const user: { email: string | null } | undefined = {
  email: "email@domain",
};
export const projectId = "project-id";

const Page = (_props: { system: any }) => {
  return <></>;
};

export { Page };

export const pageFontAssets: FontAsset[] = [];
export const pageBackgroundImageAssets: ImageAsset[] = [];
