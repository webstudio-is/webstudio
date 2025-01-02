import { LargeXIcon } from "@webstudio-is/icons/svg";
import {
  type TemplateMeta,
  $,
  css,
  PlaceholderValue,
} from "@webstudio-is/template";
import { radix } from "./shared/proxy";
import {
  blur,
  borderRadius,
  borderWidth,
  boxShadow,
  colors,
  fontSize,
  fontSizeLineHeight,
  height,
  letterSpacing,
  lineHeight,
  maxWidth,
  opacity,
  spacing,
  width,
  zIndex,
} from "./shared/theme";
import { getButtonStyle } from "./shared/styles";

/**
 * Styles source without animations:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/default/ui/dialog.tsx
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/
export const meta: TemplateMeta = {
  category: "radix",
  description:
    "Displays content with an overlay that covers the window, triggered by a button. Clicking the overlay will close the dialog.",
  order: 4,
  template: (
    <radix.Dialog>
      <radix.DialogTrigger>
        <$.Button ws:style={getButtonStyle("outline")}>
          {new PlaceholderValue("Button")}
        </$.Button>
      </radix.DialogTrigger>
      <radix.DialogOverlay
        /**
         * fixed inset-0 z-50 bg-background/80 backdrop-blur-sm
         * flex
         **/
        ws:style={css`
          position: fixed;
          inset: 0;
          z-index: ${zIndex[50]};
          background-color: rgb(255 255 255 / 0.8);
          backdrop-filter: ${blur.sm};
          /* To allow positioning Content */
          display: flex;
          overflow: auto;
        `}
      >
        <radix.DialogContent
          /**
           * fixed w-full z-50
           * grid gap-4 max-w-lg
           * m-auto
           * border bg-background p-6 shadow-lg
           **/
          ws:style={css`
            width: ${width.full};
            z-index: ${zIndex[50]};
            display: flex;
            flex-direction: column;
            gap: ${spacing[4]};
            margin: auto;
            max-width: ${maxWidth.lg};
            border: ${borderWidth.DEFAULT} solid ${colors.border};
            background-color: ${colors.background};
            padding: ${spacing[6]};
            box-shadow: ${boxShadow.lg};
            position: relative;
          `}
        >
          <$.Box
            ws:label="Dialog Header"
            ws:style={css`
              display: flex;
              flex-direction: column;
              gap: ${spacing[2]};
            `}
          >
            <radix.DialogTitle
              /**
               * text-lg leading-none tracking-tight
               **/
              ws:style={css`
                font-size: ${fontSize.lg};
                line-height: ${lineHeight.none};
                letter-spacing: ${letterSpacing.tight};
                margin: 0;
              `}
            >
              {new PlaceholderValue("Dialog Title you can edit")}
            </radix.DialogTitle>
            <radix.DialogDescription
              /**
               * text-sm text-muted-foreground
               **/
              ws:style={css`
                font-size: ${fontSize.sm};
                line-height: ${fontSizeLineHeight.sm};
                color: ${colors.mutedForeground};
                margin: 0;
              `}
            >
              {new PlaceholderValue("Dialog description text you can edit")}
            </radix.DialogDescription>
          </$.Box>
          <$.Text>{new PlaceholderValue("The text you can edit")}</$.Text>
          <radix.DialogClose
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
              opacity: ${opacity[70]};
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
          </radix.DialogClose>
        </radix.DialogContent>
      </radix.DialogOverlay>
    </radix.Dialog>
  ),
};
