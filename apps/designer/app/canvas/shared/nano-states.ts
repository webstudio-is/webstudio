import { createValueContainer, useValue } from "react-nano-state";
import { type Instance } from "@webstudio-is/sdk";
import { type DropData } from "apps/designer/app/shared/canvas-components";

const dropDataContainer = createValueContainer<DropData | undefined>();
export const useDropData = () => useValue(dropDataContainer);

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

const hoveredElementContainer = createValueContainer<HTMLElement | undefined>();
export const useHoveredElement = () => useValue(hoveredElementContainer);
