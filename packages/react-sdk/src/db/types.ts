import type { InstanceProps as DbInstanceProps } from "@webstudio-is/prisma-client";
import type { UserProp } from "../user-props";
import type { Instance } from "./instance";
import type { PresetStyles, Styles } from "./style";

export type Tree = {
  id: string;
  root: Instance;
  presetStyles: PresetStyles;
  styles: Styles;
};

export type Props = {
  props: string;
  id: string;
  instanceId: string;
  treeId: string;
};

export type InstanceProps = Omit<DbInstanceProps, "props"> & {
  props: Array<UserProp>;
};
