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

const executeComputingExpressions = (
  variables: Map<string, unknown>
): Map<string, unknown> => {
  return new Map();
};

const executeEffectfulExpression = (
  code: string,
  args: Map<string, unknown>,
  variables: Map<string, unknown>
): Map<string, unknown> => {
  return new Map();
};

export const utils = {
  indexesWithinAncestors,
  executeComputingExpressions,
  executeEffectfulExpression,
};
