import { createValueContainer, useValue } from "react-nano-state";
import { type Instance } from "@webstudio-is/sdk";

const rootInstanceContainer = createValueContainer<Instance | undefined>();
export const useRootInstance = () => useValue(rootInstanceContainer);

const isPreviewModeContainer = createValueContainer<boolean>(false);
export const useIsPreviewMode = () => useValue(isPreviewModeContainer);

const isShareDialogOpenContainer = createValueContainer<boolean>(false);
export const useIsShareDialogOpen = () => useValue(isShareDialogOpenContainer);

const isPublishDialogOpenContainer = createValueContainer<boolean>(false);
export const useIsPublishDialogOpen = () =>
  useValue(isPublishDialogOpenContainer);
