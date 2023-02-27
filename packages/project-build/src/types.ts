import type { Pages } from "./schema/pages";
import type { Breakpoint } from "./schema/breakpoints";
import type { StyleDecl, StyleDeclKey } from "./schema/styles";
import type { StyleSource } from "./schema/style-sources";
import type { Instance, InstancesItem } from "./schema/instances";
import type { Prop } from "./schema/props";
import type { StyleSourceSelection } from "./schema/style-source-selections";

export type Build = {
  id: string;
  projectId: string;
  createdAt: string;
  isDev: boolean;
  isProd: boolean;
  pages: Pages;
  breakpoints: [Breakpoint["id"], Breakpoint][];
  styles: [StyleDeclKey, StyleDecl][];
  styleSources: [StyleSource["id"], StyleSource][];
  styleSourceSelections: [Instance["id"], StyleSourceSelection][];
  props: [Prop["id"], Prop][];
};

export type Tree = {
  id: string;
  projectId: string;
  buildId: string;
  instances: [InstancesItem["id"], InstancesItem][];
};
