import { atom } from "nanostores";
import type { DataSource } from "@webstudio-is/sdk";

export const $dataSourceVariables = atom<Map<DataSource["id"], unknown>>(
  new Map()
);
