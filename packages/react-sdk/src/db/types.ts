import type { InstanceProps as DbInstanceProps } from "@webstudio-is/prisma-client";
import type { UserProp } from "../user-props";
import type { Instance } from "./instance";
import type { Props } from "./props";
import type { PresetStyles, Styles } from "./style";

export type Tree = {
  id: string;
  root: Instance;
  props: Props;
  presetStyles: PresetStyles;
  styles: Styles;
};

export type InstanceProps = Omit<DbInstanceProps, "props"> & {
  props: Array<UserProp>;
};
