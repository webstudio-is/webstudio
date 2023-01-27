import type { InstanceProps as DbInstanceProps } from "@webstudio-is/prisma-client";
import type { PropsItem } from "@webstudio-is/project-build";

export type InstanceProps = Omit<DbInstanceProps, "props"> & {
  props: Array<PropsItem>;
};
