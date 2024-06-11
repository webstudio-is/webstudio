import { atom } from "nanostores";

export const $dataLoadingState = atom<"idle" | "loading" | "loaded">("idle");
