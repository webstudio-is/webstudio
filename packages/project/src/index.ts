import * as breakpointsUtils from "./shared/breakpoints";
import * as treeUtils from "./shared/tree-utils";
import * as pagesUtils from "./shared/pages";
import * as propsUtils from "./shared/props";

export const utils = {
  breakpoints: breakpointsUtils,
  tree: treeUtils,
  pages: pagesUtils,
  props: propsUtils,
} as const;

export * from "./shared/styles";
export * from "./db/schema";
export * from "./shared/canvas-components";
export type { InstanceInsertionSpec } from "./shared/tree-utils";
