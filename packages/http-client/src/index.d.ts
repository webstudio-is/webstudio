import type {
  BaseInstance,
  Breakpoint,
  UserProp,
} from "@webstudio-is/react-sdk";

export type IncludeTypes = "tree" | "props" | "breakpoints";
export type Includes<T> = { [include in IncludeTypes]: T };

export type Project = {
  tree: BaseInstance & { errors: string };
  props: Array<UserProp> & { errors: string };
  breakpoints: Array<Breakpoint> & {
    errors: string;
  };
};
