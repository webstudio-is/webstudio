import type { ParsedStyleDecl } from "@webstudio-is/css-data";
import { styles } from "./__generated__/style-presets";

const _stylePresets = {
  ...styles,
  "w-embed": [
    ...styles["w-embed"],
    {
      selector: "w-embed",
      property: "display",
      value: {
        type: "keyword",
        value: "block",
      },
    },
  ],
};

type Key = keyof typeof _stylePresets;

type WfIcons = Record<`w-icon-${string}`, ParsedStyleDecl>;

export type WfStylePresets = Record<Key, Array<ParsedStyleDecl>> & WfIcons;
export const stylePresets = _stylePresets as WfStylePresets;
