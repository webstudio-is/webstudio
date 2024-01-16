import { z } from "zod";
import {
  WsEmbedTemplate,
  generateDataFromEmbedTemplate,
} from "@webstudio-is/react-sdk";
import {
  $selectedInstanceSelector,
  $instances,
  $selectedPage,
  $registeredComponentMetas,
  $breakpoints,
} from "../nano-states";
import {
  computeInstancesConstraints,
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

  const selectedPage = $selectedPage.get();

  if (template === undefined || selectedPage === undefined) {
    return false;
  }

  // paste to the root if nothing is selected
  const instanceSelector = $selectedInstanceSelector.get() ?? [
    selectedPage.rootInstanceId,
  ];
  const breakpoints = $breakpoints.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);
  if (baseBreakpoint === undefined) {
    return false;
  }
  const metas = $registeredComponentMetas.get();
  const templateData = generateDataFromEmbedTemplate(
    template,
    metas,
    baseBreakpoint.id
  );
  const newInstances = new Map(
    templateData.instances.map((instance) => [instance.id, instance])
  );
  const rootInstanceIds = templateData.children
    .filter((child) => child.type === "id")
    .map((child) => child.value);
  const dropTarget = findClosestDroppableTarget(
    metas,
    $instances.get(),
    instanceSelector,
    computeInstancesConstraints(metas, newInstances, rootInstanceIds)
  );
  if (dropTarget === undefined) {
    return false;
  }
  insertTemplateData(templateData, dropTarget);
  return true;
};
