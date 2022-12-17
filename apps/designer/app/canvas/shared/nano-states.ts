import { createValueContainer, useValue } from "react-nano-state";
import { type Instance } from "@webstudio-is/react-sdk";

export const selectedInstanceContainer = createValueContainer<
  Instance | undefined
>();
export const useSelectedInstance = () => useValue(selectedInstanceContainer);
