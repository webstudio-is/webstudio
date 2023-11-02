/**
 * The only intent of this file is to support typings inside ../templates/route-template for easier development.
 **/
import type { ReactNode } from "react";
import type { PageData } from "../templates/route-template";
import type { Asset, ImageAsset } from "@webstudio-is/sdk";

export const fontAssets: Asset[] = [];
export const imageAssets: ImageAsset[] = [];

export const pageData: PageData = {
  site: {
    siteName: "",
    faviconAssetId: "",
    code: "",
  },
  page: {
    id: "",
    name: "",
    title: "",
    meta: {},
    rootInstanceId: "",
    path: "",
  },
};

export const user: { email: string | null } | undefined = {
  email: "email@domain",
};
export const projectId = "project-id";

const Page = (_props: { scripts: ReactNode }) => {
  return <></>;
};

export { Page };

export const pagesPaths = new Set<string>();

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
