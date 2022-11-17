import type {
  BaseInstance,
  Breakpoint,
  UserProp,
} from "@webstudio-is/react-sdk";

export type IncludeTypes = "tree" | "props" | "breakpoints" | "pages";
export type Includes<T> = { [include in IncludeTypes]: T };
export type Page = {
  id: string;
  root: [string, string];
};
export type Project = {
  tree: BaseInstance & { errors: string };
  props: Array<UserProp> & { errors: string };
  breakpoints: Array<Breakpoint> & {
    errors: string;
  };
  pages: Record<string, unknown> | null;
};
