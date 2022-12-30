import type { InstanceProps as DbInstanceProps } from "@webstudio-is/prisma-client";
import type { UserProp } from "../user-props";
import type { Instance } from "./instance";
import type { PresetStyle } from "./style";

export type Tree = {
  id: string;
  root: Instance;
  presetStyle: PresetStyle;
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
