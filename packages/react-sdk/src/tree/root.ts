import type { ComponentProps } from "react";
import { atom } from "nanostores";
import type { Build, Page } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/asset-uploader";
import { createElementsTree } from "./create-elements-tree";
import { WebstudioComponent } from "./webstudio-component";
import { getPropsByInstanceId } from "../props";
import type { Components } from "../components/components-utils";
import type { Params } from "../context";

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
  components: Components;
};

export const InstanceRoot = ({
  data,
  Component,
  components,
}: RootProps): JSX.Element | null => {
  return createElementsTree({
    imageBaseUrl: data.params?.imageBaseUrl ?? "/",
    assetBaseUrl: data.params?.assetBaseUrl ?? "/",
    instances: new Map(data.build.instances),
    rootInstanceId: data.page.rootInstanceId,
    propsByInstanceIdStore: atom(
      getPropsByInstanceId(new Map(data.build.props))
    ),
    assetsStore: atom(new Map(data.assets.map((asset) => [asset.id, asset]))),
    pagesStore: atom(new Map(data.pages.map((page) => [page.id, page]))),
    Component: Component ?? WebstudioComponent,
    components,
  });
};
