import { useAllUserProps } from "../user-props/";
import type { Tree, InstanceProps } from "../db";
import { createElementsTree } from "./create-elements-tree";
import { WrapperComponent } from "./wrapper-component";
import type { Asset } from "@webstudio-is/asset-uploader";
import { type ComponentProps } from "react";
import type { Breakpoint } from "@webstudio-is/css-data";
import { registerComponents } from "../components";
import * as customComponents from "../app/custom-components";
import { setParams, type Params } from "../app/params";

export type Data = {
  tree: Tree | null;
  breakpoints: Array<Breakpoint>;
  designTokens: Array<any>;
  props: Array<InstanceProps>;
  assets: Array<Asset>;
  params?: Params;
};

type RootProps = {
  data: Data;
  Component?: (props: ComponentProps<typeof WrapperComponent>) => JSX.Element;
};

export const InstanceRoot = ({
  data,
  Component,
}: RootProps): JSX.Element | null => {
  if (data.tree === null) {
    throw new Error("Tree is null");
  }
  useAllUserProps(data.props);
  setParams(data.params ?? null);

  registerComponents(customComponents);

  return createElementsTree({
    instance: data.tree.root,
    Component: Component ?? WrapperComponent,
  });
};
