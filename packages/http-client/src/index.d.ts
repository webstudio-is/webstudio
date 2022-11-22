import type {
  BaseInstance,
  Breakpoint,
  UserProp,
} from "@webstudio-is/react-sdk";

export type Page = {
  id: string;
  root: [string, string];
};
export type Project =
  | {
      pages: {
        [string]: {
          page: Page;
          tree: BaseInstance;
          props: Array<UserProp> | [];
          breakpoints: Array<Breakpoint> | null;
          css: string;
        };
      };
    }
  | Error;
