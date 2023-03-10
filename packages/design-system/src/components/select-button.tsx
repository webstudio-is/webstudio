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
import { cssVars } from "@webstudio-is/css-vars";

const chevronColor = cssVars.define("chevron-color");
const chevronStyles = css({ color: cssVars.use(chevronColor) });

const styles = css({
  all: "unset", // reset <button>
  height: theme.spacing[12],
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  background: theme.colors.backgroundControls,
  border: `1px solid ${theme.colors.borderMain}`,
  borderRadius: theme.borderRadius[4],
  paddingRight: theme.spacing[1],
  paddingLeft: theme.spacing[1],
  color: theme.colors.foregroundMain,
  [chevronColor]: theme.colors.foregroundSubtle,
  "&[data-placeholder]:not([data-state=open], :hover, :disabled)": {
    color: theme.colors.foregroundSubtle,
  },
  "&:hover:not(:disabled), &[data-state=open]": {
    [chevronColor]: theme.colors.foregroundMain,
  },
  "&:disabled": {
    background: theme.colors.backgroundPanel,
    color: theme.colors.foregroundDisabled,
    [chevronColor]: theme.colors.borderMain,
  },
  "&:focus-visible": {
    borderColor: theme.colors.borderFocus,
    outline: `1px solid ${theme.colors.borderFocus}`,
  },
  variants: {
    fullWidth: { true: { width: "100%" } },
  },
});

const textStyles = css(textVariants.regular, {
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
      className={styles({ css, className, fullWidth })}
      ref={ref}
    >
      {prefix}
      <span className={textStyles()}>{children}</span>
      <ChevronDownIcon className={chevronStyles()} />
    </button>
  )
);
SelectButton.displayName = "SelectButton";
