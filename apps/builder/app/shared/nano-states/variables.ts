import { atom, computed } from "nanostores";
import type { DataSource, Page, Resource, System } from "@webstudio-is/sdk";
import { tokenizePathnamePattern } from "~/builder/shared/url-pattern";
import { $publishedOrigin } from "./nano-states";
import { $selectedPage } from "./pages";

export const $dataSourceVariables = atom<Map<DataSource["id"], unknown>>(
  new Map()
);

export const $resourceValues = atom(new Map<Resource["id"], unknown>());

export const getPageDefaultSystem = ({
  origin,
  path,
}: {
  origin: string;
  path?: string;
}) => {
  const defaultSystem: System = {
    params: {},
    search: {},
    origin,
  };
  if (path) {
    const tokens = tokenizePathnamePattern(path);
    for (const token of tokens) {
      if (token.type === "param") {
        defaultSystem.params[token.name] = undefined;
      }
    }
  }
  return defaultSystem;
};

const $selectedPagePath = computed($selectedPage, (page) => page?.path);

export const $selectedPageDefaultSystem = computed(
  [$publishedOrigin, $selectedPagePath],
  (origin, path) => getPageDefaultSystem({ origin, path })
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
