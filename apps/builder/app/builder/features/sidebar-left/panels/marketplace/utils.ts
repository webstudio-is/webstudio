import {
  getStyleDeclKey,
  type Asset,
  type WebstudioData,
} from "@webstudio-is/sdk";
import type { CompactBuild } from "@webstudio-is/project-build";

const getPair = <Item extends { id: string }>(item: Item) =>
  [item.id, item] as const;

export const toWebstudioData = (
  data: CompactBuild & { assets: Asset[] }
): WebstudioData => ({
  assets: new Map(data.assets.map(getPair)),
  instances: new Map(data.instances.map(getPair)),
  dataSources: new Map(data.dataSources.map(getPair)),
  resources: new Map(data.resources.map(getPair)),
  props: new Map(data.props.map(getPair)),
  pages: data.pages,
  breakpoints: new Map(data.breakpoints.map(getPair)),
  styleSources: new Map(data.styleSources.map(getPair)),
  styleSourceSelections: new Map(
    data.styleSourceSelections.map((item) => [item.instanceId, item])
  ),
  styles: new Map(data.styles.map((item) => [getStyleDeclKey(item), item])),
});
