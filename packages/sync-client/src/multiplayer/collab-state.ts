import { atom } from "nanostores";
import type { CollaboratorInfo } from "@webstudio-is/multiplayer-protocol";

export const $collaborators = atom(new Map<string, CollaboratorInfo>());
