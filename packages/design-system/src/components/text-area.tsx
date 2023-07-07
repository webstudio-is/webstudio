/**
 * Implementation of the "Text Area" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3389
 */

import { type ComponentProps, type Ref, forwardRef } from "react";
import { type CSS, css, theme } from "../stitches.config";
import { textVariants } from "./text";

const LINE_HEIGHT = 16;
const PADDING_TOP = 6;
const PADDING_BOTTOM = 4;
const BORDER = 1;

const style = css(textVariants.regular, {
  lineHeight: `${LINE_HEIGHT}px`,
  color: theme.colors.foregroundMain,
  borderRadius: theme.borderRadius[4],
  border: `${BORDER}px solid ${theme.colors.borderMain}`,
  background: theme.colors.backgroundControls,
  paddingRight: theme.spacing[4],
  paddingLeft: theme.spacing[3],
  paddingTop: PADDING_TOP,
  paddingBottom: PADDING_BOTTOM,
  boxSizing: "border-box",
  width: "100%",
  resize: "vertical",
  "&::placeholder": {
    color: theme.colors.foregroundSubtle,
  },
  "&:disabled": {
    color: theme.colors.foregroundDisabled,
    background: theme.colors.backgroundInputDisabled,
  },
  "&:focus-visible": {
    borderColor: theme.colors.borderFocus,
    outline: `1px solid ${theme.colors.borderFocus}`,
  },
  variants: {
    state: {
      invalid: {
        color: theme.colors.foregroundDestructive,
        "&:not(:disabled):not(:focus-visible)": {
          borderColor: theme.colors.borderDestructiveMain,
        },
      },
    },
  },
});

type Props = ComponentProps<"textarea"> & {
  css?: CSS;
  rows?: number;
  state?: "invalid";
};

export const TextArea = forwardRef(
  (
    { css, className, rows = 3, state, ...props }: Props,
    ref: Ref<HTMLTextAreaElement>
  ) => {
    // We could use `box-sizing:content-box` to avoid dealing with paddings and border here
    // But then, the user of the component will not be able to set `width` reliably
    const height =
      rows * LINE_HEIGHT + PADDING_TOP + PADDING_BOTTOM + BORDER * 2;

    return (
      <textarea
        spellCheck={false}
        className={style({
          css: { height, minHeight: height, ...css },
          state,
          className,
        })}
        ref={ref}
        {...props}
      />
    );
  }
);
TextArea.displayName = "TextArea";
