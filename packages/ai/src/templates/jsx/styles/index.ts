import { parseCss } from "@webstudio-is/css-data";
import type { JsonObject } from "type-fest";
import type { Template } from "../..";
import { getCode } from "../../../post-process";
import { prompt as promptEdit } from "./__generated__/edit.prompt";
import { prompt as promptGenerate } from "./__generated__/generate.prompt";

const templateBase = {
  // maxTokens: 3000,
  getCode: (response: string) => getCode(response, "css"),
  transform: (css: string) => {
    return parseCss(css);
  },
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  validate: (json: JsonObject) => {},
};

export const templateGenerate: Template = {
  prompt: promptGenerate,
  temperature: 0.7,
  ...templateBase,
};

export const templateEdit: Template = {
  ...templateBase,
  temperature: 0.2,
  prompt: promptEdit,
};
