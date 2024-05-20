import { atom, computed } from "nanostores";
import type { DataSource, Page, Resource, System } from "@webstudio-is/sdk";
import {
  matchPathnamePattern,
  tokenizePathnamePattern,
} from "~/builder/shared/url-pattern";
import { $publishedOrigin } from "./nano-states";
import { $selectedPage } from "./pages";

export const $dataSourceVariables = atom<Map<DataSource["id"], unknown>>(
  new Map()
);

export const $resourceValues = atom(new Map<Resource["id"], unknown>());

export const getPageDefaultSystem = ({
  origin,
  path,
  history,
}: {
  origin: string;
  path?: string;
  history?: string[];
}) => {
  const defaultSystem: System = {
    params: {},
    search: {},
    origin,
  };
  if (path) {
    const tokens = tokenizePathnamePattern(path);
    // try to match the first item in history to let user
    // see the page without manually entering params
    // or selecting them in address bar
    const matchedParams = history
      ? matchPathnamePattern(path, history[0])
      : undefined;
    for (const token of tokens) {
      if (token.type === "param") {
        defaultSystem.params[token.name] =
          matchedParams?.[token.name] ?? undefined;
      }
    }
  }
  return defaultSystem;
};

const $selectedPagePath = computed($selectedPage, (page) => page?.path);

const $selectedPageHistory = computed($selectedPage, (page) => page?.history);

export const $selectedPageDefaultSystem = computed(
  [$publishedOrigin, $selectedPagePath, $selectedPageHistory],
  (origin, path, history) => getPageDefaultSystem({ origin, path, history })
);

export const mergeSystem = (left: System, right?: System): System => {
  return {
    ...left,
    ...right,
    params: {
      ...left.params,
      ...right?.params,
    },
    search: {
      ...left.search,
      ...right?.search,
    },
  };
};

export const updateSystem = (page: Page, update: Partial<System>) => {
  const dataSourceVariables = new Map($dataSourceVariables.get());
  const system = dataSourceVariables.get(page.systemDataSourceId) as
    | undefined
    | System;

  const newSystem: System = {
    search: {},
    params: {},
    origin: $publishedOrigin.get(),
    ...system,
    ...update,
  };
  dataSourceVariables.set(page.systemDataSourceId, newSystem);
  $dataSourceVariables.set(dataSourceVariables);
};
