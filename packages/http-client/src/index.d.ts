import type {
  BaseInstance,
  Breakpoint,
  UserProp,
} from "@webstudio-is/react-sdk";

export type IncludeTypes = "tree" | "props" | "breakpoints";
export type Includes<T> = { [include in IncludeTypes]: T };
export type Page = {
  id: string;
  root: [string, string];
};
export type Project = {
  [include in string]: {
    page: Page;
    tree: BaseInstance & { errors: string };
    props: Array<UserProp> & { errors: string };
    breakpoints: Array<Breakpoint> & {
      errors: string;
    };
    css: string;
  };
};
