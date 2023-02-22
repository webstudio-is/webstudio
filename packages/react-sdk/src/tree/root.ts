import type { ComponentProps } from "react";
import { atom } from "nanostores";
import type { Tree } from "@webstudio-is/project-build";
import type { Asset } from "@webstudio-is/asset-uploader";
import { createElementsTree } from "./create-elements-tree";
import { WrapperComponent } from "./wrapper-component";
import { registerComponents } from "../components";
import { customComponents as defaultCustomComponents } from "../app/custom-components";
import { setParams, type Params } from "../app/params";
import { getPropsByInstanceId } from "../props";
import type { GetComponent } from "../components/components-utils";

export type Data = {
  tree: Tree | null;
  assets: Array<Asset>;
  params?: Params;
};

type RootProps = {
  data: Data;
  Component?: (props: ComponentProps<typeof WrapperComponent>) => JSX.Element;
  customComponents?: Parameters<typeof registerComponents>[0];
  getComponent: GetComponent;
};

export const InstanceRoot = ({
  data,
  Component,
  customComponents = defaultCustomComponents,
  getComponent,
}: RootProps): JSX.Element | null => {
  if (data.tree === null) {
    throw new Error("Tree is null");
  }

  setParams(data.params ?? null);

  registerComponents(customComponents);

  return createElementsTree({
    instance: data.tree.root,
    propsByInstanceIdStore: atom(
      getPropsByInstanceId(new Map(data.tree.props))
    ),
    assetsStore: atom(new Map(data.assets.map((asset) => [asset.id, asset]))),
    Component: Component ?? WrapperComponent,
    getComponent,
  });
};
