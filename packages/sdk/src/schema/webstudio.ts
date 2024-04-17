import { z } from "zod";
import { Asset, Assets } from "./assets";
import { DataSource, DataSources } from "./data-sources";
import { Resource, Resources } from "./resources";
import { Instance, InstanceChild, Instances } from "./instances";
import { Prop, Props } from "./props";
import { Breakpoint, Breakpoints } from "./breakpoints";
import {
  StyleSourceSelection,
  StyleSourceSelections,
} from "./style-source-selections";
import { StyleSource, StyleSources } from "./style-sources";
import { StyleDecl, Styles } from "./styles";
import { Pages } from "./pages";

/**
 * transferrable and insertable part of webstudio data
 * may contain reusable parts like tokens and custom components
 */
export const WebstudioFragment = z.object({
  children: z.array(InstanceChild),
  instances: z.array(Instance),
  assets: z.array(Asset),
  dataSources: z.array(DataSource),
  resources: z.array(Resource),
  props: z.array(Prop),
  breakpoints: z.array(Breakpoint),
  styleSourceSelections: z.array(StyleSourceSelection),
  styleSources: z.array(StyleSource),
  styles: z.array(StyleDecl),
});

export type WebstudioFragment = z.infer<typeof WebstudioFragment>;

/**
 * all persisted webstudio data in normalized format
 * should be used for composing parts of logic within
 * single transaction
 */
export type WebstudioData = {
  pages: Pages;
  assets: Assets;
  dataSources: DataSources;
  resources: Resources;
  instances: Instances;
  props: Props;
  breakpoints: Breakpoints;
  styleSourceSelections: StyleSourceSelections;
  styleSources: StyleSources;
  styles: Styles;
};
