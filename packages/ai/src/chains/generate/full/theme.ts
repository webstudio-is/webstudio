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
  fontSize: ["10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px"],
  spacing: ["4px", "8px", "12px", "16px", "20px", "24px", "28px", "32px"],
  borderRadius: ["2px", "4px", "6px", "8px", "10px", "12px", "16px", "20px"],
};
// fontSize: {
//   xs: "10px",
//   s: "12px",
//   m: "14px",
//   l: "16px",
//   xl: "18px",
//   "2xl": "20px",
//   "3xl": "24px",
//   "4xl": "28px",
// },
// spacing: {
//   xs: "4px",
//   s: "8px",
//   m: "12px",
//   l: "16px",
//   xl: "20px",
//   "2xl": "24px",
//   "3xl": "28px",
//   "4xl": "32px",
// },
// borderRadius: {
//   xs: "2px",
//   s: "4px",
//   m: "6px",
//   l: "8px",
//   xl: "10px",
//   "2xl": "12px",
//   "3xl": "16px",
//   "4xl": "20px",
// },

// Theme visualizer
// const styles = document.body.appendChild(document.createElement("style"));
// styles.innerHTML = `
// body { display: flex; gap: 20px }
// div {   width: 50px; height: 50px;}
// `

// const theme = {}

// let c = document.body.appendChild(document.createElement("section"));
// theme.colors.forEach((color) => {
//   const d = c.appendChild(document.createElement("div"));
//   d.style.backgroundColor = color.trim();
// });

// c = document.body.appendChild(document.createElement("section"));
// theme.text.forEach((color) => {
//   const d = c.appendChild(document.createElement("div"));
//   d.style.backgroundColor = color.trim();
// });

// c = document.body.appendChild(document.createElement("section"));
// theme.gradients.forEach((color) => {
//   const d = c.appendChild(document.createElement("div"));
//   d.style.backgroundImage = `linear-gradient(${color[0]}, ${color[1]})`;
// });
