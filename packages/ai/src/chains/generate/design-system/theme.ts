import type { Model as BaseModel } from "../../../models/types";
import { formatPrompt } from "../../../utils/format-prompt";
import { getCode } from "../../../utils/get-code";
import { type Chain, type ChainMessage } from "../../types";
import { prompt as promptTemplate } from "./__generated__/theme.prompt";

export const create = <ModelMessageFormat>(): Chain<
  BaseModel<ModelMessageFormat>
> =>
  async function chain({ model, context }) {
    const { prompts } = context;

    const requestMessage: ChainMessage = [
      "user",
      formatPrompt(prompts, promptTemplate),
    ];

    console.log(requestMessage[1]);

    const response = await model.request({
      messages: model.generateMessages([requestMessage]),
    });

    const json = getCode(response, "json");
    const theme = JSON.parse(json);

    theme.theme = {
      ...themeDefaults,
      ...theme.theme,
    };

    return {
      llmMessages: [[requestMessage, ["assistant", response]]],
      code: [JSON.stringify(theme)],
      json: [theme],
    };
  };

export const themeDefaults = {
  fontSize: [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96, 128],
  spacing: [2, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 64, 80, 128],
  borderRadius: [4, 6, 8, 10, 12, 16, 20],
};

// Theme visualizer
// const theme = {}
// const styles = document.body.appendChild(document.createElement("style"));
// styles.innerHTML = `
// body { display: flex; gap: 20px }
// div { padding: 1em 2em; border-radius: 1em; margin-bottom: 0.5em; font-family: sans-serif; text-align: center; }
// .gradient { padding: 3em }
// `

// let c = document.body.appendChild(document.createElement("section"));
// Object.entries(theme.background).forEach(([name,color]) => {
//   const d = c.appendChild(document.createElement("div"));
//   d.textContent = name
//   d.style.backgroundColor = color.trim();
// });

// c = document.body.appendChild(document.createElement("section"));
// Object.entries(theme.foreground).forEach(([name,color]) => {
//   const d = c.appendChild(document.createElement("div"));
//    d.textContent = name
//   d.style.backgroundColor = color.trim();
// });

// c = document.body.appendChild(document.createElement("section"));
// theme.gradients.forEach((color) => {
//   const d = c.appendChild(document.createElement("div"));
//   d.classList.add('gradient')
//   d.style.backgroundImage = `linear-gradient(${color[0]}, ${color[1]})`;
// });
