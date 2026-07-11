import { atom } from "nanostores";

export type SectionName =
  | "general"
  | "agents"
  | "auth"
  | "redirects"
  | "publish"
  | "marketplace"
  | "backups";

export const $openProjectSettings = atom<SectionName | undefined>();
