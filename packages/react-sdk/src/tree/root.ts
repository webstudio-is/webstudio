import type { ComponentProps } from "react";
import { atom } from "nanostores";
import type { Build, Page } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/asset-uploader";
import { createElementsTree } from "./create-elements-tree";
import { WebstudioComponent } from "./webstudio-component";
import { registerComponents } from "../components";
import { customComponents as defaultCustomComponents } from "../app/custom-components";
import { setParams, type Params } from "../app/params";
import { getPropsByInstanceId } from "../props";
import type { GetComponent } from "../components/components-utils";

export type Data = {
  page: Page;
  pages: Array<Page>;
  build: Build;
  assets: Array<Asset>;
  params?: Params;
};

export type RootPropsData = Omit<Data, "build"> & {
  build: Pick<Data["build"], "instances" | "props">;
};

type RootProps = {
  data: RootPropsData;
  Component?: (props: ComponentProps<typeof WebstudioComponent>) => JSX.Element;
  customComponents?: Parameters<typeof registerComponents>[0];
  getComponent: GetComponent;
};

export const InstanceRoot = ({
  data,
  Component,
  customComponents = defaultCustomComponents,
  getComponent,
}: RootProps): JSX.Element | null => {
  setParams(data.params);
  registerComponents(customComponents);
  return createElementsTree({
    instances: new Map(data.build.instances),
    rootInstanceId: data.page.rootInstanceId,
    propsByInstanceIdStore: atom(
      getPropsByInstanceId(new Map(data.build.props))
    ),
    assetsStore: atom(new Map(data.assets.map((asset) => [asset.id, asset]))),
    pagesStore: atom(new Map(data.pages.map((page) => [page.id, page]))),
    Component: Component ?? WebstudioComponent,
    getComponent,
  });
};
