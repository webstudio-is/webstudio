/**
 * Implementation of the "Label" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A3274
 */

import type { ComponentProps, ReactNode, Ref } from "react";
import { forwardRef } from "react";
import { textVariants } from "./text";
import { styled, theme } from "../stitches.config";
import { Label as RadixLabel } from "@radix-ui/react-label";

export const labelColors = ["default", "preset", "local", "remote"] as const;

const StyledLabel = styled(RadixLabel, {
  all: "unset", // reset <button>
  margin: 0,
  WebkitAppearance: "none",
  WebkitFontSmoothing: "antialiased",
  display: "block",
  cursor: "default",
  userSelect: "none",

  boxSizing: "border-box",
  flexShrink: 0,
  py: theme.spacing[1],
  border: "1px solid transparent",
  borderRadius: theme.borderRadius[3],

  // https://github.com/webstudio-is/webstudio-builder/issues/1271#issuecomment-1478436340
  "&:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
    outlineOffset: 1,
  },

  "&[aria-disabled=true]": {
    color: theme.colors.foregroundDisabled,
  },

  variants: {
    // The "display: inline" property can cause sizing issues with the label in certain scenarios.
    // However, in our case, the label is being used as a button.
    // To ensure compatibility with form labels, we only set the "inline" property if the "htmlFor" attribute is present.
    hasHtmlFor: {
      true: {
        display: "inline",
      },
    },
    color: {
      default: {
        color: theme.colors.foregroundMain,
      },
      preset: {
        px: theme.spacing[3],
        backgroundColor: theme.colors.backgroundPresetMain,
        borderColor: theme.colors.borderMain,
        color: theme.colors.foregroundMain,
        "&:hover": {
          backgroundColor: theme.colors.backgroundPresetHover,
        },
      },
      local: {
        px: theme.spacing[3],
        backgroundColor: theme.colors.backgroundLocalMain,
        borderColor: theme.colors.borderLocalMain,
        color: theme.colors.foregroundLocalMain,
        "&:hover": {
          backgroundColor: theme.colors.backgroundLocalHover,
        },
      },
      remote: {
        px: theme.spacing[3],
        backgroundColor: theme.colors.backgroundRemoteMain,
        borderColor: theme.colors.borderRemoteMain,
        color: theme.colors.foregroundRemoteMain,
        "&:hover": {
          backgroundColor: theme.colors.backgroundRemoteHover,
        },
      },
    },
    truncate: {
      true: {
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        flexBasis: 0,
        flexGrow: 1,
      },
    },
    sectionTitle: {
      true: textVariants.titles,
      false: textVariants.labelsSentenceCase,
    },
  },

  defaultVariants: {
    color: "default",
    sectionTitle: false,
  },
});

type Props = {
  color?: (typeof labelColors)[number];
  sectionTitle?: boolean;
  disabled?: boolean;
  truncate?: boolean;
  children: ReactNode;
} & ComponentProps<typeof StyledLabel>;

export const isLabelButton = (color: Props["color"]) =>
  color === "preset" || color === "local" || color === "remote";

export const Label = forwardRef((props: Props, ref: Ref<HTMLLabelElement>) => {
  const { disabled, children, ...rest } = props;

  // To enable keyboard accessibility for users who rely on the spacebar to activate the radix
  // when using a preset, local, or remote color, we need to wrap the label with a button that has a "label" role.
  // (Radix adds role="button" to the label)
  const isButton = isLabelButton(props.color);

  return (
    <StyledLabel
      ref={ref}
      asChild={isButton}
      // Label is exluded from tab order by default
      tabIndex={props.tabIndex ?? (isButton ? -1 : undefined)}
      hasHtmlFor={props.htmlFor !== undefined}
      aria-disabled={disabled}
      {...rest}
    >
      {isButton ? <button>{children}</button> : children}
    </StyledLabel>
  );
});

Label.displayName = "Label";
