import { atom } from "nanostores";
import type { WorkspaceRelation } from "@webstudio-is/project";

export const $workspaceRelation = atom<WorkspaceRelation | "own">("own");

export const $workspaces = atom<
  Array<{
    id: string;
    name: string;
    isDefault: boolean;
    workspaceRelation: WorkspaceRelation | "own";
  }>
>([]);
