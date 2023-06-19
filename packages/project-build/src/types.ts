import type { Pages } from "./schema/pages";
import type { Breakpoint } from "./schema/breakpoints";
import type { StyleDecl, StyleDeclKey } from "./schema/styles";
import type { StyleSource } from "./schema/style-sources";
import type { Instance } from "./schema/instances";
import type { Prop } from "./schema/props";
import type { StyleSourceSelection } from "./schema/style-source-selections";
import type { Deployment } from "./schema/deployment";
import type { DataSource } from "./schema/data-sources";

export type Build = {
  id: string;
  projectId: string;
  version: number;
  createdAt: string;
  pages: Pages;
  breakpoints: [Breakpoint["id"], Breakpoint][];
  styles: [StyleDeclKey, StyleDecl][];
  styleSources: [StyleSource["id"], StyleSource][];
  styleSourceSelections: [Instance["id"], StyleSourceSelection][];
  props: [Prop["id"], Prop][];
  instances: [Instance["id"], Instance][];
  dataSources: [DataSource["id"], DataSource][];
  deployment?: Deployment | undefined;
};
