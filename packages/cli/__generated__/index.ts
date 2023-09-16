/**
 * The only intent of this file is to support typings inside ../templates/route-template for easier development.
 **/
import type { PageData } from "../templates/route-template";
import type { Components } from "@webstudio-is/react-sdk";
import type { Asset } from "@webstudio-is/sdk";

export const components = new Map() as Components;

export const fontAssets: Asset[] = [];

export const pageData: PageData = {
  build: {
    props: [],
    instances: [],
    dataSources: [],
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

const indexesWithinAncestors = new Map<string, number>([]);

const getDataSourcesLogic = () => {
  return new Map();
};

export const formsProperties = new Map<
  string,
  { method?: string; action?: string }
>([]);

export const utils = {
  indexesWithinAncestors,
  getDataSourcesLogic,
};
