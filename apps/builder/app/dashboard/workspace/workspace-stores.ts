import { atom } from "nanostores";
import type { Role } from "@webstudio-is/project";

export const $workspaceRole = atom<Role | "own">("own");

export const $workspaces = atom<
  Array<{
    id: string;
    name: string;
    isDefault: boolean;
    role: Role | "own";
  }>
>([]);
