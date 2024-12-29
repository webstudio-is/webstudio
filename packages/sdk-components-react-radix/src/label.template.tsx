import {
  css,
  PlaceholderValue,
  type TemplateMeta,
} from "@webstudio-is/template";
import { radix } from "./shared/proxy";
import { fontSize, lineHeight, weights } from "./shared/theme";

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/label.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/
export const meta: TemplateMeta = {
  category: "radix",
  description:
    "An accessible label to describe the purpose of an input. Match the “For” property on the label with the “ID” of the input to connect them.",
  order: 102,
  template: (
    <radix.Label
      // text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70
      // We are not supporting peer like styles yet
      ws:style={css`
        font-size: ${fontSize.sm};
        line-height: ${lineHeight.none};
        font-weight: ${weights.medium};
      `}
    >
      {new PlaceholderValue("Form Label")}
    </radix.Label>
  ),
};
