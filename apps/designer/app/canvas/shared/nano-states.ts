import { createValueContainer, useValue } from "react-nano-state";
import { type Instance } from "@webstudio-is/react-sdk";

export const selectedInstanceContainer = createValueContainer<
  Instance | undefined
>();
export const useSelectedInstance = () => useValue(selectedInstanceContainer);

export const hoveredInstanceContainer = createValueContainer<
  Instance | undefined
>();
export const useHoveredInstance = () => useValue(hoveredInstanceContainer);

const selectedElementContainer = createValueContainer<
  HTMLElement | undefined
>();
export const useSelectedElement = () => useValue(selectedElementContainer);
