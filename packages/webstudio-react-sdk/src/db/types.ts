import type {
  InstanceProps as DbInstanceProps,
  Project,
  User,
  Breakpoints,
} from "@prisma/client";
import type { UserProp } from "../user-props";
import type { Instance } from "./instance";

export type Tree = {
  id: string;
  root: Instance;
};

export type InstanceProps = Omit<DbInstanceProps, "props"> & {
  props: Array<UserProp>;
};

export type { DbInstanceProps, Project, User, Breakpoints };
