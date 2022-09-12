export type IncludeTypes = "tree" | "props" | "breakpoints";
export type Includes<T> = { [include in IncludeTypes]: T };
export type Project = {
  tree: {
    id: string;
    root: {
      comopnent: string;
      id: string;
      cssRules: Array<string>;
      children: Array<string>;
    };
  } & { errors: string };
  props: Array<string> & { errors: string };
  breakpoints: Array<{ label: string; minWidtrh: number; id: string }> & {
    errors: string;
  };
};
