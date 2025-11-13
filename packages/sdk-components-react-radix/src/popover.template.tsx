import { LargeXIcon } from "@webstudio-is/icons/svg";
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
  height,
  opacity,
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
        <radix.PopoverClose
          ws:label="Close Button"
          /**
           * absolute right-4 top-4
           * rounded-sm opacity-70
           * ring-offset-background
           * hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
           * flex items-center justify-center h-4 w-4
           **/
          ws:style={css`
            position: absolute;
            right: ${spacing[4]};
            top: ${spacing[4]};
            border-radius: ${borderRadius.sm};
            display: flex;
            align-items: center;
            justify-content: center;
            height: ${height[4]};
            width: ${height[4]};
            border: 0;
            background-color: transparent;
            outline: none;
            &:hover {
              opacity: ${opacity[100]};
            }
            &:focus-visible {
              box-shadow: ${boxShadow.ring};
            }
          `}
        >
          <$.HtmlEmbed ws:label="Close Icon" code={LargeXIcon} />
        </radix.PopoverClose>
      </radix.PopoverContent>
    </radix.Popover>
  ),
};
