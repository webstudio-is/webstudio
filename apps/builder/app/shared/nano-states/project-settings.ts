import { atom } from "nanostores";

export const $openProjectSettings = atom<
  "general" | "redirects" | "publish" | "marketplace" | undefined
>();
