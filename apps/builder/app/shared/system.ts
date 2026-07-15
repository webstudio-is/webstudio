import { atom, computed } from "nanostores";
import { getPagePath, isPage, type Page, type System } from "@webstudio-is/sdk";
import {
  compilePathnamePattern,
  matchPathnamePattern,
  tokenizePathnamePattern,
} from "@webstudio-is/project-build/runtime";
import { $selectedPage } from "./nano-states/pages";
import { $pages } from "./sync/data-stores";
import { $publishedOrigin } from "./nano-states/misc";
import { executeRuntimeMutation } from "./instance-utils/data";

export const $systemDataByPage = atom(
  new Map<Page["id"], Pick<System, "search" | "params">>()
);

const extractParams = (
  pattern: string,
  path?: string,
  fallbackPattern?: string
) => {
  const params: System["params"] = {};
  const tokens = tokenizePathnamePattern(pattern);
  // try to match the first item in history to let user
  // see the page without manually entering params
  // or selecting them in address bar
  const matchedParams = path
    ? (matchPathnamePattern(pattern, path) ??
      (fallbackPattern
        ? matchPathnamePattern(fallbackPattern, path)
        : undefined))
    : undefined;
  for (const token of tokens) {
    if (token.type === "param") {
      params[token.name] = matchedParams?.[token.name] ?? undefined;
    }
  }
  return params;
};

export const $currentSystem = computed(
  [$publishedOrigin, $selectedPage, $pages, $systemDataByPage],
  (origin, page, pages, systemByPage) => {
    const system: System = {
      search: {},
      params: {},
      pathname: "/",
      origin,
    };
    if (page === undefined || pages === undefined || !isPage(page)) {
      return system;
    }
    const systemData = systemByPage.get(page.id);
    const pagePath = getPagePath(page.id, pages);
    const extractedParams = extractParams(
      pagePath,
      page.history?.[0],
      page.path
    );
    const params = { ...extractedParams, ...systemData?.params };
    const pathname = compilePath(pagePath, params) || "/";
    return {
      search: { ...system.search, ...systemData?.search },
      params,
      pathname,
      origin,
    };
  }
);

const compilePath = (pattern: string, params: System["params"]) => {
  const tokens = tokenizePathnamePattern(pattern);
  return compilePathnamePattern(tokens, params);
};

/**
 * put new path into the beginning of history
 * and drop paths in the end when exceeded 20
 */
const savePathInHistory = (pageId: string, path: string) => {
  executeRuntimeMutation({
    id: "pages.savePathInHistory",
    input: {
      pageId,
      path,
    },
  });
};

export const updateCurrentSystem = (
  update: Partial<Pick<System, "search" | "params">>
) => {
  const page = $selectedPage.get();
  if (!isPage(page)) {
    return;
  }
  const systemDataByPage = new Map($systemDataByPage.get());
  const systemData = systemDataByPage.get(page.id);
  const search = update.search ?? systemData?.search ?? {};
  const params = update.params ?? systemData?.params ?? {};
  systemDataByPage.set(page.id, { search, params });
  $systemDataByPage.set(systemDataByPage);
  const pages = $pages.get();
  const pagePath = pages ? getPagePath(page.id, pages) : page.path;
  savePathInHistory(page.id, compilePath(pagePath, params));
};
