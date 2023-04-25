import { parseJsx } from "@builder.io/mitosis";
import { WsEmbedTemplate } from "@webstudio-is/react-sdk";
import type { JsonObject } from "type-fest";
import type { Template } from "../..";
import { getCode, mitosisJSONToWsEmbedTemplate } from "../../../post-process";
import { prompt as promptEdit } from "./__generated__/edit.prompt";
import { prompt as promptGenerate } from "./__generated__/generate.prompt";

const templateBase = {
  temperature: 0,
  // maxTokens: 3000,
  getCode: (response: string) => getCode(response, "jsx"),
  transform: (jsx: string) => {
    const json = parseJsx(
      `export default function App() {\n return ${jsx}\n}`,
      {
        typescript: false,
      }
    );

    // get random images
    // https://source.unsplash.com/random/?<query>&w=960

    return JSON.parse(mitosisJSONToWsEmbedTemplate()({ component: json }));
  },
  validate: (json: JsonObject) => {
    WsEmbedTemplate.parse(json);
  },
};

export const templateGenerate: Template = {
  prompt: promptGenerate,
  ...templateBase,
};

export const templateEdit: Template = {
  prompt: promptEdit,
  ...templateBase,
};
