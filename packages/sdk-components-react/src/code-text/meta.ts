import { BracesIcon } from "@webstudio-is/icons/svg";
import {
  codeTextDefaultLanguage,
  codeTextDefaultTheme,
  type PresetStyle,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { code } from "@webstudio-is/sdk/normalize.css";
import type { defaultTag } from "./base";
import { codeTextLanguageNames, codeTextThemeNames } from "./options";
import {
  codeTextThemeBackgroundVariable,
  codeTextThemeColorVariable,
} from "./theme";

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
  contentModel: {
    category: "instance",
    children: ["text"],
  },
  textContent: {
    control: "textContent",
    type: "string",
    required: false,
    editor: {
      control: "code",
      languageProp: "language",
    },
  },
  initialProps: ["id", "class", "language", "theme"],
  props: {
    language: {
      label: "Language",
      required: false,
      control: "select",
      type: "string",
      contentMode: true,
      defaultValue: codeTextDefaultLanguage,
      options: codeTextLanguageNames,
    },
    theme: {
      label: "Theme",
      required: false,
      control: "select",
      type: "string",
      defaultValue: codeTextDefaultTheme,
      options: codeTextThemeNames,
    },
  },
};
