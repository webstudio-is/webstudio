/**
 * Implementation of the "Title (title of: section)" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=2%3A12361
 */

import { PlusIcon } from "@webstudio-is/icons";
import {
  forwardRef,
  type ReactNode,
  type Ref,
  type ComponentProps,
} from "react";
import { theme, css, type CSS } from "../stitches.config";
import { Button } from "./button";
import { textVariants } from "./text";
import { cssVars } from "@webstudio-is/css-vars";
import { handleArrowFocus } from "./primitives/arrow-focus";

const addIconColor = cssVars.define("add-icon-color");

const containerStyle = css({
  position: "relative",
  height: theme.spacing[15],
  [addIconColor]: theme.colors.foregroundSubtle,
  "&:hover, &:has(:focus-visible), &[data-state=open]": {
    [addIconColor]: theme.colors.foregroundMain,
  },
});

const buttonStyle = css({
  all: "unset", // reset <button>
  display: "flex",
  gap: theme.spacing[5],
  alignItems: "center",
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  paddingLeft: theme.spacing[9],
  paddingRight: theme.spacing[7],
  color: theme.colors.foregroundSubtle,
  cursor: "pointer",
  "&:hover, &:focus-visible, &[data-state=open]": {
    color: theme.colors.foregroundMain,
  },
  "&:focus-visible::before": {
    content: "''",
    position: "absolute",
    top: 0,
    bottom: 0,
    left: theme.spacing[2],
    right: theme.spacing[2],
    borderRadius: theme.borderRadius[4],
    border: `2px solid ${theme.colors.borderFocus}`,
  },
  variants: {
    hasAddIcon: { true: { paddingRight: theme.spacing[16] } },
  },
});

const buttonTextStyle = css(textVariants.titles, {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const addButtonSlotStyle = css({
  position: "absolute",
  right: theme.spacing[6],
  top: theme.spacing[4],
});

const dotsSlotStyle = css({
  display: "flex",
});

const dotStyle = css({
  width: theme.spacing[4],
  height: theme.spacing[4],
  borderRadius: theme.borderRadius.round,
  marginRight: -2,
  variants: {
    color: {
      local: { backgroundColor: theme.colors.foregroundLocalFlexUi },
      remote: { backgroundColor: theme.colors.foregroundRemoteFlexUi },
    },
  },
});

export const SectionTitle = forwardRef(
  (
    {
      isOpen,
      onClose,
      onOpen,
      onAdd,
      hasItems = true,
      addIcon = <PlusIcon />,
      className,
      css,
      children,
      ...props
    }: Omit<ComponentProps<"button">, "onClick"> & {
      isOpen: boolean;
      onClose: () => void;
      onOpen: () => void;
      onAdd?: () => void;
      /**
       * If set to `true`, dots aren't shown,
       * but still affects how isOpen is treated and whether onAdd is called on open.
       */
      hasItems?: boolean | Array<"local" | "remote">;
      addIcon?: ReactNode;
      css?: CSS;
    },
    ref: Ref<HTMLButtonElement>
  ) => {
    const isEmpty =
      hasItems === false || (Array.isArray(hasItems) && hasItems.length === 0);

    const dots = isOpen === false && Array.isArray(hasItems) ? hasItems : [];

    const state = isOpen && isEmpty === false ? "open" : "closed";

    return (
      <div
        className={containerStyle({ className, css })}
        data-state={state}
        onKeyDown={handleArrowFocus}
      >
        <button
          className={buttonStyle({ hasAddIcon: onAdd !== undefined })}
          onClick={() => {
            if (isOpen && isEmpty === false) {
              onClose();
            }
            if (isOpen === false) {
              onOpen();
            }
            if (isEmpty) {
              onAdd?.();
            }
          }}
          data-state={state}
          ref={ref}
          {...props}
        >
          <div className={buttonTextStyle()}>{children}</div>
          {dots.length > 0 && (
            <div className={dotsSlotStyle()}>
              {dots.map((color) => (
                <div key={color} className={dotStyle({ color })} />
              ))}
            </div>
          )}
        </button>
        {onAdd && (
          <div className={addButtonSlotStyle()}>
            <Button
              tabIndex={-1}
              color="ghost"
              prefix={addIcon}
              css={{ color: cssVars.use(addIconColor) }}
              onClick={() => {
                if (isOpen === false) {
                  onOpen();
                }
                onAdd();
              }}
            />
          </div>
        )}
      </div>
    );
  }
);
SectionTitle.displayName = "SectionTitle";
