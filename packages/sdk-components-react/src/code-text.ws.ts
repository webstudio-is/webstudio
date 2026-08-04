import { BracesIcon } from "@webstudio-is/icons/svg";
import type { PresetStyle, WsComponentMeta } from "@webstudio-is/sdk";
import { languageNames } from "@shikijs/langs";
import { themeNames } from "@shikijs/themes";
import { code } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./code-text";
import { props } from "./__generated__/code-text.props";

const presetStyle = {
  code: [
    ...code,
    {
      property: "display",
      value: { type: "keyword", value: "block" },
    },
    {
      property: "white-space-collapse",
      value: { type: "keyword", value: "preserve" },
    },
    {
      property: "text-wrap-mode",
      value: { type: "keyword", value: "wrap" },
    },
    {
      property: "padding-left",
      value: { type: "unit", value: 0.2, unit: "em" },
    },
    {
      property: "padding-right",
      value: { type: "unit", value: 0.2, unit: "em" },
    },
    {
      property: "background-color",
      value: { type: "rgb", r: 238, g: 238, b: 238, alpha: 1 },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  icon: BracesIcon,
  description:
    "Display source code with syntax highlighting for a selected language and theme.",
  contentModel: {
    category: "instance",
    children: [],
  },
  presetStyle,
  initialProps: ["id", "class", "code", "lang", "theme"],
  props: {
    ...props,
    code: {
      required: true,
      control: "codetext",
      type: "string",
    },
    lang: {
      label: "Language",
      required: true,
      control: "select",
      type: "string",
      defaultValue: "javascript",
      options: ["plaintext", ...languageNames],
      bindable: false,
    },
    theme: {
      label: "Theme",
      required: true,
      control: "select",
      type: "string",
      defaultValue: "github-light",
      options: [...themeNames],
      bindable: false,
    },
  },
};
