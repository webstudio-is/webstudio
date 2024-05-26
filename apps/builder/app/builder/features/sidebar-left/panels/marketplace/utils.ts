import type { WebstudioData } from "@webstudio-is/sdk";
import type { BuildData } from "~/shared/marketplace/types";

export const toWebstudioData = (data: BuildData): WebstudioData => ({
  pages: data.build.pages,
  assets: new Map(data.assets),
  instances: new Map(data.build.instances),
  dataSources: new Map(data.build.dataSources),
  resources: new Map(data.build.resources),
  props: new Map(data.build.props),
  styleSourceSelections: new Map(data.build.styleSourceSelections),
  styleSources: new Map(data.build.styleSources),
  breakpoints: new Map(data.build.breakpoints),
  styles: new Map(data.build.styles),
});
