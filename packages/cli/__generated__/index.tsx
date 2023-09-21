/**
 * The only intent of this file is to support typings inside ../templates/route-template for easier development.
 **/
import type { ReactNode } from "react";
import type { PageData } from "../templates/route-template";
import type { Asset } from "@webstudio-is/sdk";

export const fontAssets: Asset[] = [];

export const pageData: PageData = {
  build: {
    props: [],
  },
  pages: [],

  page: {
    id: "",
    name: "",
    title: "",
    meta: {},
    rootInstanceId: "",
    path: "",
  },
  assets: [],
};

export const user: { email: string | null } | undefined = {
  email: "email@domain",
};
export const projectId = "project-id";

const Page = (_props: { scripts: ReactNode }) => {
  return <></>;
};

export { Page };

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);
