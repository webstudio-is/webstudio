export type IncludeTypes = "tree" | "props" | "breakpoints";
export type Includes<T> = { [include in IncludeTypes]: T };
export type Project = {
  tree?: string;
  props?: string;
  breakpoints?: string;
};
