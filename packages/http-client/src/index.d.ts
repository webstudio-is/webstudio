import type {
  BaseInstance,
  Breakpoint,
  UserProp,
} from "@webstudio-is/react-sdk";

export type Page = {
  id: string;
  root: [string, string];
};
export type Project = {
  [string]: {
    page: Page;
    tree: BaseInstance | null;
    props: Array<UserProp> | [];
    breakpoints: Array<Breakpoint> | null;
    css: string;
  };
};
