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
    tree: BaseInstance & { errors: string };
    props: Array<UserProp> & { errors: string };
    breakpoints: Array<Breakpoint> & {
      errors: string;
    };
    css: string;
  };
};
