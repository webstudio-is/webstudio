import { atom } from "nanostores";

export type SectionName =
  | "general"
  | "agents"
  | "connectAgent"
  | "auth"
  | "redirects"
  | "publish"
  | "marketplace"
  | "backups";

export const $openProjectSettings = atom<SectionName | undefined>();
