import {
  $,
  css,
  PlaceholderValue,
  type TemplateMeta,
} from "@webstudio-is/template";
import { radix } from "./shared/proxy";
import {
  borderRadius,
  borderWidth,
  boxShadow,
  colors,
  fontSize,
  fontSizeLineHeight,
  height,
  opacity,
  spacing,
  width,
  zIndex,
} from "./shared/theme";
import { CheckMarkIcon } from "@webstudio-is/icons/svg";

const createSelectItem = (value: string, label: string) => {
  return (
    <radix.SelectItem
      value={value}
      // relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none
      // focus:bg-accent focus:text-accent-foreground
      // data-[disabled]:pointer-events-none data-[disabled]:opacity-50
      ws:style={css`
        position: relative;
        display: flex;
        width: ${width.full};
        cursor: default;
        user-select: none;
        align-items: center;
        border-radius: ${borderRadius.md};
        padding: ${spacing[1.5]} ${spacing[2]} ${spacing[1.5]} ${spacing[8]};
        font-size: ${fontSize.sm};
        line-height: ${fontSizeLineHeight.sm};
        outline: none;
        &:focus {
          background-color: ${colors.accent};
          color: ${colors.accentForeground};
        }
        &[data-disabled] {
          pointer-events: none;
          opacity: ${opacity[50]};
        }
      `}
    >
      <radix.SelectItemIndicator
        // absolute left-2 flex h-3.5 w-3.5 items-center justify-center
        ws:style={css`
          position: absolute;
          left: ${spacing[2]};
          display: flex;
          height: ${height[3.5]};
          width: ${width[3.5]};
          align-items: center;
          justify-content: center;
        `}
      >
        <$.HtmlEmbed ws:label="Indicator Icon" code={CheckMarkIcon} />
      </radix.SelectItemIndicator>
      <radix.SelectItemText>{new PlaceholderValue(label)}</radix.SelectItemText>
    </radix.SelectItem>
  );
};

export const meta: TemplateMeta = {
  category: "radix",
  description:
    "Use within a form to give your users a list of options to choose from.",
  order: 10,
  template: (
    <radix.Select>
      <radix.SelectTrigger
        // flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background
        // placeholder:text-muted-foreground
        // focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        // disabled:cursor-not-allowed disabled:opacity-50
        ws:style={css`
          display: flex;
          height: ${height[10]};
          width: ${width.full};
          align-items: center;
          justify-content: between;
          border-radius: ${borderRadius.md};
          border: ${borderWidth.DEFAULT} solid ${colors.input};
          background-color: ${colors.background};
          padding: ${spacing[2]} ${spacing[3]};
          font-size: ${fontSize.sm};
          line-height: ${fontSizeLineHeight.sm};
          &::placeholder {
            color: ${colors.mutedForeground};
          }
          &:focus-visible {
            outline: none;
            box-shadow: ${boxShadow.ring};
          }
          &:disabled {
            cursor: not-allowed;
            opacity: ${opacity[50]};
          }
        `}
      >
        <radix.SelectValue placeholder="Theme" />
      </radix.SelectTrigger>
      <radix.SelectContent
        // relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md
        // data-[state=open]:animate-in
        // data-[state=closed]:animate-out data-[state=closed]:fade-out-0
        // data-[state=open]:fade-in-0
        // data-[state=closed]:zoom-out-95
        // data-[state=open]:zoom-in-95
        // data-[side=bottom]:slide-in-from-top-2
        // data-[side=left]:slide-in-from-right-2
        // data-[side=right]:slide-in-from-left-2
        // data-[side=top]:slide-in-from-bottom-2
        // position=popper
        // data-[side=bottom]:translate-y-1
        // data-[side=left]:-translate-x-1
        // data-[side=right]:translate-x-1
        // data-[side=top]:-translate-y-1
        ws:style={css`
          position: relative;
          z-index: ${zIndex[50]};
          min-width: 8rem;
          overflow: hidden;
          border-radius: ${borderRadius.md};
          border: ${borderWidth.DEFAULT} solid ${colors.border};
          background-color: ${colors.popover};
          color: ${colors.popoverForeground};
          box-shadow: ${boxShadow.md};
        `}
      >
        <radix.SelectViewport
          // p-1
          // position=popper
          // h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]
          ws:style={css`
            padding: ${spacing[1]};
            height: var(--radix-select-trigger-height);
            width: ${width.full};
            min-width: var(--radix-select-trigger-width);
          `}
        >
          {createSelectItem("light", "Light")}
          {createSelectItem("dark", "Dark")}
          {createSelectItem("system", "System")}
        </radix.SelectViewport>
      </radix.SelectContent>
    </radix.Select>
  ),
};
