import { atom } from "nanostores";
import {
  extractWebstudioFragment,
  findTargetAndInsertFragment,
} from "~/shared/instance-utils";
import type { WebstudioData } from "@webstudio-is/sdk";
import { MarketplaceProduct } from "@webstudio-is/project-build";
import type { BuildData } from "~/shared/marketplace/types";

export const $activeProductData = atom<WebstudioData | undefined>();

export const categories: Array<{
  category: MarketplaceProduct["category"];
  label: string;
}> = [{ category: "sectionTemplates", label: "Section Templates" }];

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

/**
 * Insert page as a template.
 * - Currently only supports inserting everything from the body
 * - Could be extended to support children of some other instance e.g. Marketplace Item
 */
export const insert = ({
  instanceId,
  data,
}: {
  instanceId: string;
  data: WebstudioData;
}) => {
  const fragment = extractWebstudioFragment(data, instanceId);
  fragment.instances = fragment.instances.filter(
    (instance) => instance.component !== "Body"
  );
  findTargetAndInsertFragment(fragment);
};
