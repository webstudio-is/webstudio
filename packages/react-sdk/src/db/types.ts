import type { InstanceProps as DbInstanceProps } from "@webstudio-is/prisma-client";
import type { Instance } from "./instance";
import type { Props, PropsItem } from "./props";
import type { PresetStyles, Styles } from "./style";

export type Tree = {
  id: string;
  root: Instance;
  props: Props;
  presetStyles: PresetStyles;
  styles: Styles;
};

export type InstanceProps = Omit<DbInstanceProps, "props"> & {
  props: Array<PropsItem>;
};
