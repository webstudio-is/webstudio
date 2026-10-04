import { atom, computed } from "nanostores";
import { getPagePath, isPage, type Page, type System } from "@webstudio-is/sdk";
import {
  compilePathnamePattern,
  tokenizePathnamePattern,
} from "@webstudio-is/project-build/runtime";
import { matchPathnamePattern } from "@webstudio-is/wsauth";
import { toWebstudioParams } from "@webstudio-is/react-sdk";
import { $selectedPage } from "./nano-states/pages";
import { $pages } from "./sync/data-stores";
import { $publishedOrigin } from "./nano-states/misc";
import { executeRuntimeMutation } from "./instance-utils/data";

export const $systemDataByPage = atom(
  new Map<Page["id"], Pick<System, "search" | "searchAll" | "params">>()
);

const singleSearchValues = (search: System["search"]) =>
  Object.fromEntries(
    Object.entries(search)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map(([name, value]) => [name, [value]])
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
  let matchedParams: System["params"] | undefined;
  if (path) {
    const match = matchPathnamePattern(pattern, path);
    if (match) {
      matchedParams = toWebstudioParams(pattern, match);
    } else if (fallbackPattern) {
      const fallbackMatch = matchPathnamePattern(fallbackPattern, path);
      if (fallbackMatch) {
        matchedParams = toWebstudioParams(fallbackPattern, fallbackMatch);
      }
    }
  }
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
      searchAll: {},
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
      searchAll:
        systemData?.searchAll ?? singleSearchValues(systemData?.search ?? {}),
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
  update: Partial<Pick<System, "search" | "searchAll" | "params">>
) => {
  const page = $selectedPage.get();
  if (!isPage(page)) {
    return;
  }
  const systemDataByPage = new Map($systemDataByPage.get());
  const systemData = systemDataByPage.get(page.id);
  const search = update.search ?? systemData?.search ?? {};
  const searchAll =
    update.searchAll ??
    (update.search === undefined
      ? (systemData?.searchAll ?? singleSearchValues(search))
      : singleSearchValues(update.search));
  const params = update.params ?? systemData?.params ?? {};
  systemDataByPage.set(page.id, { search, searchAll, params });
  $systemDataByPage.set(systemDataByPage);
  const pages = $pages.get();
  const pagePath = pages ? getPagePath(page.id, pages) : page.path;
  savePathInHistory(page.id, compilePath(pagePath, params));
};
