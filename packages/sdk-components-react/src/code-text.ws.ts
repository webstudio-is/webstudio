import { BracesIcon } from "@webstudio-is/icons/svg";
import type { PresetStyle, WsComponentMeta } from "@webstudio-is/sdk";
import { code } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./code-text-base";
import { codeTextLanguageNames, codeTextThemeNames } from "./code-text-options";
import {
  codeTextThemeBackgroundVariable,
  codeTextThemeColorVariable,
} from "./code-text-theme";

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
      property: "color",
      value: { type: "var", value: codeTextThemeColorVariable },
    },
    {
      property: "background-color",
      value: {
        type: "var",
        value: codeTextThemeBackgroundVariable,
        fallback: { type: "rgb", r: 238, g: 238, b: 238, alpha: 1 },
      },
    },
  ],
} satisfies PresetStyle<typeof defaultTag>;

export const meta: WsComponentMeta = {
  icon: BracesIcon,
  description:
    "Display source code with syntax highlighting for a selected language and theme.",
  presetStyle,
  initialProps: ["id", "class", "code", "language", "theme"],
  props: {
    code: {
      required: true,
      control: "codetext",
      type: "string",
    },
    language: {
      label: "Language",
      required: true,
      control: "select",
      type: "string",
      options: codeTextLanguageNames,
    },
    theme: {
      label: "Theme",
      required: true,
      control: "select",
      type: "string",
      options: codeTextThemeNames,
    },
  },
};
