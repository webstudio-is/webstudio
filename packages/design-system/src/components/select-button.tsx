/**
 * Implementation of the "Select Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4-3263
 *
 * Primarily intended to be used as Trigger in <Select>.
 * Implemented separately in case we'll need it as a trigger for something else.
 */

import {
  forwardRef,
  type Ref,
  type ComponentProps,
  type ReactNode,
} from "react";
import { textVariants } from "./text";
import { theme, css, type CSS } from "../stitches.config";
import { ChevronDownIcon } from "@webstudio-is/icons";

const chevronColor = `--ws-select-button-chevron-color`;
const chevronStyle = css({ color: `var(${chevronColor})` });

const style = css({
  all: "unset", // reset <button>
  minWidth: 0,
  height: theme.sizes.controlHeight,
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  background: theme.colors.backgroundControls,
  border: `1px solid transparent`,
  borderRadius: theme.borderRadius[4],
  paddingRight: theme.spacing[1],
  paddingLeft: theme.spacing[1],
  color: theme.colors.foregroundMain,
  [chevronColor]: theme.colors.foregroundSubtle,
  "&:hover": {
    borderColor: theme.colors.borderMain,
  },
  "&[data-placeholder]:not([data-state=open], :hover, :disabled)": {
    color: theme.colors.foregroundSubtle,
  },
  "&:hover:not(:disabled), &[data-state=open]": {
    [chevronColor]: theme.colors.foregroundMain,
  },
  "&:disabled": {
    background: theme.colors.backgroundInputDisabled,
    color: theme.colors.foregroundDisabled,
    [chevronColor]: theme.colors.borderMain,
  },
  "&:focus-visible": {
    borderColor: theme.colors.borderFocus,
  },
  variants: {
    fullWidth: { true: { width: "100%" } },
  },
});

const textStyle = css(textVariants.regular, {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  paddingRight: theme.spacing[2],
  paddingLeft: theme.spacing[3],
});

type Props = Omit<ComponentProps<"button">, "prefix"> & {
  fullWidth?: boolean;
  css?: CSS;
  prefix?: ReactNode; // primarily for <NestedIconLabel>
};

export const SelectButton = forwardRef(
  (
    { prefix, children, css, className, fullWidth, ...rest }: Props,
    ref: Ref<HTMLButtonElement>
  ) => (
    <button
      {...rest}
      className={style({ css, className, fullWidth })}
      ref={ref}
    >
      {prefix}
      <span className={textStyle()}>{children}</span>
      <ChevronDownIcon className={chevronStyle()} />
    </button>
  )
);
SelectButton.displayName = "SelectButton";
