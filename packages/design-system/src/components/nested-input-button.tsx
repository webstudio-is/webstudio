/**
 * Implementation of the "Nested Input Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=148-3113
 */

import { ChevronDownIcon } from "@webstudio-is/icons";
import { forwardRef, type ComponentProps, type Ref } from "react";
import { textVariants } from "./text";
import { type CSS, css, theme } from "../stitches.config";

// From Figma:
// In production the unitless unit should be an en dash with a space before and after
export const nestedSelectButtonUnitless = " – ";

const style = css({
  all: "unset",
  ...textVariants.unit,
  color: theme.colors.foregroundSubtle,
  borderRadius: theme.borderRadius[2],
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: theme.spacing[11],
  whiteSpace: "pre", // to make nestedSelectButtonUnitless work as expected
  "&:not(:has(svg))": {
    paddingLeft: theme.spacing[2],
    paddingRight: theme.spacing[2],
  },
  "&[data-state=hover], &:not([data-state=open], :disabled, :focus-visible):hover":
    {
      color: theme.colors.foregroundMain,
      backgroundColor: theme.colors.backgroundHover,
    },
  "&[data-state=open], &:focus-visible": {
    color: theme.colors.foregroundContrastMain,
    backgroundColor: theme.colors.backgroundActive,
  },
  "&:disabled": {
    color: theme.colors.foregroundDisabled,
  },
  variants: {
    /**
     * ChevronDownIcon is the only case when we have svg inside the button and width is not equal to height
     */
    hasChildren: {
      true: {
        "&:where(:has(svg))": {
          width: theme.spacing[11],
        },
      },
    },
  },
});

export const NestedInputButton = forwardRef(
  (
    {
      css,
      className,
      children,
      ...props
    }: ComponentProps<"button"> & { css?: CSS },
    ref: Ref<HTMLButtonElement>
  ) => (
    <button
      className={style({ css, className, hasChildren: children !== undefined })}
      {...props}
      ref={ref}
    >
      {children ?? <ChevronDownIcon />}
    </button>
  )
);
NestedInputButton.displayName = "NestedInputButton";
