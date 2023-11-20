import { atom } from "nanostores";

export const $breakpointsMenuView = atom<
  "initial" | "editor" | "confirmation" | undefined
>();
