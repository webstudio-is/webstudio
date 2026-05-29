import { useStore } from "@nanostores/react";
import { getPagePath, type Page } from "@webstudio-is/sdk";
import {
  compilePathnamePattern,
  tokenizePathnamePattern,
} from "~/builder/shared/url-pattern";
import { $publishedOrigin } from "~/shared/nano-states";
import { $pages } from "~/shared/sync/data-stores";
import { $currentSystem } from "~/shared/system";

export type Values = {
  name: string;
  parentFolderId: string;
  path: string;
  isHomePage: boolean;
  title: string;
  description: string;
  excludePageFromSearch: string;
  language: string;
  socialImageUrl: string;
  socialImageAssetId: string;
  status: string | undefined;
  redirect: string;
  documentType: NonNullable<Page["meta"]["documentType"]>;
  content: string;
  auth: {
    login: string;
    password: string;
  };
  customMetas: { property: string; content: string }[];
  marketplace: {
    include: boolean;
    category: string;
    thumbnailAssetId: string;
  };
};

export type FieldName = keyof Values;

export type OnChange = (
  event: {
    [K in keyof Values]: {
      field: K;
      value: Values[K];
    };
  }[keyof Values]
) => void;

export type Errors = {
  [fieldName in Exclude<FieldName, "auth">]?: string[];
} & {
  auth?: {
    login?: string[];
    password?: string[];
  };
};

export const usePageUrl = (values: Values) => {
  const pages = useStore($pages);
  let path = "";
  if (pages !== undefined) {
    if (values.isHomePage) {
      path = "/";
    } else {
      const foldersPath = getPagePath(values.parentFolderId, pages);
      path = [foldersPath, values.path]
        .filter(Boolean)
        .join("/")
        .replace(/\/+/g, "/");
    }
  }

  const system = useStore($currentSystem);
  const publishedOrigin = useStore($publishedOrigin);
  const tokens = tokenizePathnamePattern(path);
  const compiledPath = compilePathnamePattern(tokens, system.params);
  return `${publishedOrigin}${compiledPath}`;
};
