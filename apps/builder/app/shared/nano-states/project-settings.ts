import { atom } from "nanostores";

export type SectionName =
  | "general"
  | "redirects"
  | "publish"
  | "marketplace"
  | "backups";

export const $openProjectSettings = atom<SectionName | undefined>();
