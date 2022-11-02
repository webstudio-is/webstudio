import { useAllUserProps } from "../user-props/";
import type { Tree, InstanceProps } from "../db";
import type { Breakpoint } from "../css";
import { globalCss, setBreakpoints, renderFontFaces } from "../stitches";
import { createElementsTree } from "./create-elements-tree";
import {
  WrapperComponent,
  type WrapperComponentProps,
} from "./wrapper-component";
import {
  type FontFormat,
  FONT_FORMATS,
  getFontFaces,
} from "@webstudio-is/fonts";
import type { Asset, FontAsset } from "@webstudio-is/asset-uploader";
import { useRef } from "react";

export type Data = {
  tree: Tree | null;
  breakpoints: Array<Breakpoint>;
  props: Array<InstanceProps>;
  assets: Array<Asset>;
};

export const useGlobalStyles = ({ assets }: { assets: Array<Asset> }) => {
  const ref = useRef<Array<Asset>>();

  // This may look weird, but globalCss API doesn't allow us creating global styles with data,
  // so we have to manually ensure calling it only once
  if (ref.current === assets) return;

  const fontAssets = assets.filter((asset) =>
    FONT_FORMATS.has(asset.format as FontFormat)
  ) as Array<FontAsset>;

  renderFontFaces(getFontFaces(fontAssets));
  globalCss({
    html: {
      height: "100%",
    },
  })();

  ref.current = assets;
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
  useGlobalStyles({ assets: data.assets });
  useAllUserProps(data.props);
  return createElementsTree({
    instance: data.tree.root,
    breakpoints: data.breakpoints,
    Component: Component ?? WrapperComponent,
  });
};
