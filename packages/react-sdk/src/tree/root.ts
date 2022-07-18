import { useAllUserProps } from "../user-props/";
import type { Tree, InstanceProps } from "../db";
import type { Breakpoint } from "../css";
import { globalCss, setBreakpoints } from "../stitches";
import { createElementsTree } from "./create-elements-tree";
import {
  WrapperComponent,
  type WrapperComponentProps,
} from "./wrapper-component";

export type Data = {
  tree: Tree | null;
  breakpoints: Array<Breakpoint>;
  props: Array<InstanceProps>;
};

export const globalStyles = globalCss({
  body: {
    margin: 0,
  },
});

type RootProps = {
  data: Data;
  Component?: (props: WrapperComponentProps) => JSX.Element;
};

export const Root = ({ data, Component }: RootProps): JSX.Element | null => {
  if (data.tree === null) {
    throw new Error("Tree is null");
  }
  setBreakpoints(data.breakpoints);
  globalStyles();
  useAllUserProps(data.props);
  return createElementsTree({
    instance: data.tree.root,
    breakpoints: data.breakpoints,
    Component: Component ?? WrapperComponent,
  });
};
