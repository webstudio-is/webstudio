import { z } from "zod";
import { WsEmbedTemplate } from "@webstudio-is/sdk";
import { generateDataFromEmbedTemplate } from "@webstudio-is/react-sdk";
import { $registeredComponentMetas } from "../nano-states";
import {
  findClosestInsertable,
  insertWebstudioFragmentAt,
} from "../instance-utils";

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
  const fragment = generateDataFromEmbedTemplate(template, metas);
  const insertable = findClosestInsertable(fragment);
  if (insertable === undefined) {
    return false;
  }
  insertWebstudioFragmentAt(fragment, insertable);
  return true;
};
