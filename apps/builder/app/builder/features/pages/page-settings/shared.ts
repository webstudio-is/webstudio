import { useStore } from "@nanostores/react";
import { getPagePath } from "@webstudio-is/sdk";
import type { PageSettingsValues } from "@webstudio-is/project-build/runtime/pages";
import {
  compilePathnamePattern,
  tokenizePathnamePattern,
} from "@webstudio-is/project-build/runtime/url-pattern";
import { $publishedOrigin } from "~/shared/nano-states";
import { $pages } from "~/shared/sync/data-stores";
import { $currentSystem } from "~/shared/system";

export type OnChange = (
  event: {
    [K in keyof PageSettingsValues]: {
      field: K;
      value: PageSettingsValues[K];
    };
  }[keyof PageSettingsValues]
) => void;

export const usePageUrl = (values: PageSettingsValues) => {
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
