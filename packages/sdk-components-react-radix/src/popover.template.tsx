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
  borderWidth,
  boxShadow,
  colors,
  spacing,
  width,
  zIndex,
} from "./shared/theme";

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/popover.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/
export const meta: TemplateMeta = {
  category: "radix",
  description: "Displays rich content in a portal, triggered by a button.",
  order: 6,
  template: (
    <radix.Popover>
      <radix.PopoverTrigger>
        <$.Button ws:style={getButtonStyle("outline")}>
          {new PlaceholderValue("Button")}
        </$.Button>
      </radix.PopoverTrigger>
      <radix.PopoverContent
        /**
         *  z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none
         **/
        ws:style={css`
          z-index: ${zIndex[50]};
          width: ${width[72]};
          border-radius: ${borderRadius.md};
          border: ${borderWidth.DEFAULT} solid ${colors.border};
          background-color: ${colors.popover};
          padding: ${spacing[4]};
          color: ${colors.popoverForeground};
          box-shadow: ${boxShadow.md};
          outline: none;
        `}
      >
        <$.Text>{new PlaceholderValue("The text you can edit")}</$.Text>
      </radix.PopoverContent>
    </radix.Popover>
  ),
};
