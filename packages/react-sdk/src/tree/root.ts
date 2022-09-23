import { useAllUserProps } from "../user-props/";
import type { Tree, InstanceProps } from "../db";
import type { Breakpoint } from "../css";
import { globalCss, setBreakpoints } from "../stitches";
import { createElementsTree } from "./create-elements-tree";
import {
  WrapperComponent,
  type WrapperComponentProps,
} from "./wrapper-component";
import { FONT_FORMATS, getFontFaces } from "@webstudio-is/fonts";
import type { Asset, FontAsset } from "@webstudio-is/asset-uploader";
import { useCallback } from "react";

export type Data = {
  tree: Tree | null;
  breakpoints: Array<Breakpoint>;
  props: Array<InstanceProps>;
  assets: Array<Asset>;
};

export const useGlobalStyles = ({ assets }: { assets: Array<Asset> }) => {
  return useCallback(() => {
    const fontAssets = assets.filter(
      (asset) => asset.format in FONT_FORMATS
    ) as Array<FontAsset>;

    return globalCss({
      "@font-face": getFontFaces(fontAssets),
      html: {
        height: "100%",
      },
    })();
  }, [assets]);
};

type RootProps = {
  data: Data;
  Component?: (props: WrapperComponentProps) => JSX.Element;
};

export const InstanceRoot = ({
  data,
  Component,
}: RootProps): JSX.Element | null => {
  if (data.tree === null) {
    throw new Error("Tree is null");
  }
  setBreakpoints(data.breakpoints);
  useGlobalStyles({ assets: data.assets })();
  useAllUserProps(data.props);
  return createElementsTree({
    instance: data.tree.root,
    breakpoints: data.breakpoints,
    Component: Component ?? WrapperComponent,
  });
};
