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
import type { labelColors } from "./label";

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
  ...textVariants.titles,
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  paddingLeft: theme.spacing[9],
  paddingRight: theme.spacing[5],
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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

const addButtonSlotStyle = css({
  position: "absolute",
  right: theme.spacing[6],
  top: theme.spacing[4],
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
      ...props
    }: Omit<ComponentProps<"button">, "onClick"> & {
      isOpen: boolean;
      onClose: () => void;
      onOpen: () => void;
      onAdd?: () => void;
      hasItems?: boolean | Array<Omit<(typeof labelColors)[number], "default">>;
      addIcon?: ReactNode;
      css?: CSS;
    },
    ref: Ref<HTMLButtonElement>
  ) => {
    const isEmpty =
      hasItems === false || (Array.isArray(hasItems) && hasItems.length === 0);

    const state = isOpen && isEmpty === false ? "open" : "closed";

    return (
      <div className={containerStyle({ className, css })} data-state={state}>
        <button
          className={buttonStyle({ hasAddIcon: onAdd !== undefined })}
          onClick={() => {
            if (isOpen) {
              onClose();
            } else {
              onOpen();
            }
            if (isEmpty) {
              onAdd?.();
            }
          }}
          data-state={state}
          ref={ref}
          {...props}
        />
        {onAdd && (
          <div className={addButtonSlotStyle()}>
            <Button
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

// const useTrackFocusVisible = () => {
//   const [isFocused, setFocused] = useState(false);
//   return {
//     isFocused,
//     hadnleFocus(event: FocusEvent<HTMLElement>) {
//       if (event.currentTarget.matches(":focus-visible")) {
//         setFocused(true);
//       }
//     },
//     handleBlur() {
//       setFocused(false);
//     },
//   };
// };
