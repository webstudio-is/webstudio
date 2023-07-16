import { z } from "zod";
import {
  WsEmbedTemplate,
  generateDataFromEmbedTemplate,
} from "@webstudio-is/react-sdk";
import {
  selectedInstanceSelectorStore,
  instancesStore,
  selectedPageStore,
  registeredComponentMetasStore,
  breakpointsStore,
} from "../nano-states";
import {
  findClosestDroppableTarget,
  insertTemplateData,
} from "../instance-utils";
import { isBaseBreakpoint } from "../breakpoints";

const version = "@webstudio/template";

const ClipboardData = z.object({ [version]: WsEmbedTemplate });

const parse = (clipboardData: string): WsEmbedTemplate | undefined => {
  try {
    const data = ClipboardData.parse(JSON.parse(clipboardData));
    return data[version];
  } catch {
    return;
  }
};

export const mimeType = "text/plain";

export const onPaste = (clipboardData: string): boolean => {
  const template = parse(clipboardData);

  const selectedPage = selectedPageStore.get();

  if (template === undefined || selectedPage === undefined) {
    return false;
  }

  // paste to the root if nothing is selected
  const instanceSelector = selectedInstanceSelectorStore.get() ?? [
    selectedPage.rootInstanceId,
  ];
  const breakpoints = breakpointsStore.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);
  if (baseBreakpoint === undefined) {
    return false;
  }
  const templateData = generateDataFromEmbedTemplate(
    template,
    baseBreakpoint.id
  );
  const dragComponents = Array.from(
    new Set(templateData.instances.map((instance) => instance.component))
  );
  const dropTarget = findClosestDroppableTarget(
    registeredComponentMetasStore.get(),
    instancesStore.get(),
    instanceSelector,
    dragComponents
  );
  if (dropTarget === undefined) {
    return false;
  }
  insertTemplateData(templateData, dropTarget);
  return true;
};
