import {
  $,
  css,
  PlaceholderValue,
  type TemplateMeta,
} from "@webstudio-is/template";
import { radix } from "./shared/proxy";
import { getButtonStyle } from "./shared/styles";
import {
  borderRadius,
  boxShadow,
  colors,
  fontSize,
  fontSizeLineHeight,
  spacing,
  zIndex,
} from "./shared/theme";

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/tooltip.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/
export const meta: TemplateMeta = {
  category: "radix",
  description:
    "Displays content that is related to the trigger, when the trigger is hovered with the mouse or focused with the keyboard. You are reading an example of a tooltip right now.",
  order: 7,
  template: (
    <radix.Tooltip>
      <radix.TooltipTrigger>
        <$.Button ws:style={getButtonStyle("outline")}>
          {new PlaceholderValue("Button")}
        </$.Button>
      </radix.TooltipTrigger>
      <radix.TooltipContent
        /**
         *  z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md
         **/
        ws:style={css`
          z-index: ${zIndex[50]};
          overflow: hidden;
          border-radius: ${borderRadius.md};
          background-color: ${colors.popover};
          padding: ${spacing[1.5]} ${spacing[3]};
          font-size: ${fontSize.sm};
          line-height: ${fontSizeLineHeight.sm};
          color: ${colors.popoverForeground};
          box-shadow: ${boxShadow.md};
        `}
      >
        <$.Text>{new PlaceholderValue("The text you can edit")}</$.Text>
      </radix.TooltipContent>
    </radix.Tooltip>
  ),
};
