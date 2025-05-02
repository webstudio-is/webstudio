import { atom } from "nanostores";
import type { DataSource, Resource } from "@webstudio-is/sdk";

export const $dataSourceVariables = atom<Map<DataSource["id"], unknown>>(
  new Map()
);

export const $resourceValues = atom(new Map<Resource["id"], unknown>());
