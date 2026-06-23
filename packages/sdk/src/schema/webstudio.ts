import { z } from "zod";
import { asset, type Assets } from "./assets";
import { dataSource, type DataSources } from "./data-sources";
import { resource, type Resources } from "./resources";
import { instance, instanceChild, type Instances } from "./instances";
import { prop, type Props } from "./props";
import { breakpoint, type Breakpoints } from "./breakpoints";
import {
  styleSourceSelection,
  type StyleSourceSelections,
} from "./style-source-selections";
import { styleSource, type StyleSources } from "./style-sources";
import { styleDecl, type Styles } from "./styles";
import type { Pages } from "./pages";

/**
 * transferrable and insertable part of webstudio data
 * may contain reusable parts like tokens and custom components
 */
export const webstudioFragment = z.object({
  children: z.array(instanceChild),
  instances: z.array(instance),
  assets: z.array(asset),
  dataSources: z.array(dataSource),
  resources: z.array(resource),
  props: z.array(prop),
  breakpoints: z.array(breakpoint),
  styleSourceSelections: z.array(styleSourceSelection),
  styleSources: z.array(styleSource),
  styles: z.array(styleDecl),
});

export type WebstudioFragment = z.infer<typeof webstudioFragment>;

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
