/**
 * The only intent of this file is to support typings inside ../templates/route-template for easier development.
 **/
import type { Asset, ImageAsset } from "@webstudio-is/sdk";
import type { PageData } from "../templates/defaults/__templates__/route-template";
import type { PageMeta } from "@webstudio-is/react-sdk";

export const fontAssets: Asset[] = [];
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

export const getPageMeta = ({}: {
  params: Record<string, any>;
  resources: Record<string, any>;
}): PageMeta => {
  return {
    title: "Page title",
    custom: [],
  };
};

const Page = (_props: { params: any }) => {
  return <></>;
};

export { Page };

type Params = Record<string, string | undefined>;
export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const pagesPaths = new Set<string>();

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
