/**
 * The only intent of this file is to support typings inside ../templates/route-template for easier development.
 **/
import type { Asset, ImageAsset } from "@webstudio-is/sdk";
import type { PageData } from "../templates/defaults/__templates__/route-template";

export const fontAssets: Asset[] = [];
export const imageAssets: ImageAsset[] = [];

export const pageData: PageData = {
  project: {
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

type Params = Record<string, string | undefined>;
const Page = (_props: { params: Params }) => {
  return <></>;
};

export { Page };

export const getRemixParams = ({ ...params }: Params): Params => {
  return params;
};

export const pagesPaths = new Set<string>();

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
