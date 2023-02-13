import { atom } from "nanostores";

export const minZoom = 10;
const maxZoom = 100;
const zoomStep = 20;

export const zoomStore = atom<number>(100);

export const zoomIn = () => {
  zoomStore.set(Math.min(zoomStore.get() + zoomStep, maxZoom));
};

export const zoomOut = () => {
  zoomStore.set(Math.max(zoomStore.get() - zoomStep, minZoom));
};

export const synchronizedBreakpointsStores = [
  ["zoomStore", zoomStore],
] as const;
