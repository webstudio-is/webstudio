import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import type { JsonObject } from "type-fest";
import type { Template } from "../..";
import { getCode } from "../../post-process";
import { prompt as promptEdit } from "./__generated__/edit.prompt";

export const templateEdit: Template = {
  prompt: promptEdit,
  temperature: 0,
  // maxTokens: 3000,
  getCode: (response: string) => getCode(response, "js"),
  transform: (js: string) => js,
  validate: (json: JsonObject) => {
    WsEmbedTemplate.parse(json);
  },
};
