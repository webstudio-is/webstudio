import { z } from "zod";
import {
  WsEmbedTemplate,
  generateDataFromEmbedTemplate,
} from "@webstudio-is/react-sdk";
import { $registeredComponentMetas, $breakpoints } from "../nano-states";
import { findClosestInsertable, insertTemplateData } from "../instance-utils";
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

export const onPaste = (clipboardData: string) => {
  const template = parse(clipboardData);
  if (template === undefined) {
    return false;
  }
  const metas = $registeredComponentMetas.get();
  const breakpoints = $breakpoints.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);
  if (baseBreakpoint === undefined) {
    return false;
  }
  const fragment = generateDataFromEmbedTemplate(
    template,
    metas,
    baseBreakpoint.id
  );
  const insertable = findClosestInsertable(fragment);
  if (insertable === undefined) {
    return false;
  }
  insertTemplateData(fragment, insertable);
  return true;
};
