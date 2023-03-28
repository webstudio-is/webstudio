import { atom } from "nanostores";

export type TextToolbarState = {
  selectionRect: undefined | DOMRect;
  isBold: boolean;
  isItalic: boolean;
  isSuperscript: boolean;
  isSubscript: boolean;
  isLink: boolean;
  isSpan: boolean;
};

export const textToolbarStore = atom<undefined | TextToolbarState>(undefined);

export const synchronizedCanvasStores = [
  ["textToolbar", textToolbarStore],
] as const;
