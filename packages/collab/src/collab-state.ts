import { atom } from "nanostores";
import type { CollaboratorInfo } from "./protocol";

export const $collaborators = atom(new Map<string, CollaboratorInfo>());

export const $collabUnsaved = atom(false);
