import type { InstanceProps as DbInstanceProps } from "@webstudio-is/prisma-client";
import type { Instance } from "./instance";
import type { Props, PropsItem } from "./props";
import type { Styles } from "./style";

export type Tree = {
  id: string;
  root: Instance;
  props: Props;
  styles: Styles;
};

export type InstanceProps = Omit<DbInstanceProps, "props"> & {
  props: Array<PropsItem>;
};
