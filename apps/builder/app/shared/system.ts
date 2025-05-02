import { atom, computed } from "nanostores";
import { findPageByIdOrPath, type Page, type System } from "@webstudio-is/sdk";
import {
  compilePathnamePattern,
  matchPathnamePattern,
  tokenizePathnamePattern,
} from "~/builder/shared/url-pattern";
import { $selectedPage } from "./awareness";
import { $pages, $publishedOrigin } from "./nano-states";
import { serverSyncStore } from "./sync";

export const $systemDataByPage = atom(
  new Map<Page["id"], Pick<System, "search" | "params">>()
);

const extractParams = (pattern: string, path?: string) => {
  const params: System["params"] = {};
  const tokens = tokenizePathnamePattern(pattern);
  // try to match the first item in history to let user
  // see the page without manually entering params
  // or selecting them in address bar
  const matchedParams = path ? matchPathnamePattern(pattern, path) : undefined;
  for (const token of tokens) {
    if (token.type === "param") {
      params[token.name] = matchedParams?.[token.name] ?? undefined;
    }
  }
  return params;
};

export const $currentSystem = computed(
  [$publishedOrigin, $selectedPage, $systemDataByPage],
  (origin, page, systemByPage) => {
    const system: System = {
      search: {},
      params: {},
      origin,
    };
    if (page === undefined) {
      return system;
    }
    const systemData = systemByPage.get(page.id);
    const extractedParams = extractParams(page.path, page.history?.[0]);
    return {
      search: { ...system.search, ...systemData?.search },
      params: { ...extractedParams, ...systemData?.params },
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
  serverSyncStore.createTransaction([$pages], (pages) => {
    if (pages === undefined) {
      return;
    }
    const page = findPageByIdOrPath(pageId, pages);
    if (page === undefined) {
      return;
    }
    const history = Array.from(page.history ?? []);
    history.unshift(path);
    page.history = Array.from(new Set(history)).slice(0, 20);
  });
};

export const updateCurrentSystem = (
  update: Partial<Pick<System, "search" | "params">>
) => {
  const page = $selectedPage.get();
  if (page === undefined) {
    return;
  }
  const systemDataByPage = new Map($systemDataByPage.get());
  const systemData = systemDataByPage.get(page.id);
  const search = update.search ?? systemData?.search ?? {};
  const params = update.params ?? systemData?.params ?? {};
  systemDataByPage.set(page.id, { search, params });
  $systemDataByPage.set(systemDataByPage);
  savePathInHistory(page.id, compilePath(page.path, params));
};
