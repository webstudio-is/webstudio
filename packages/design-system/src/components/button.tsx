/**
 * Implementation of the "Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A2709
 */

import React, { forwardRef, type Ref, type ComponentProps } from "react";
import { typography } from "./typography";
import { styled, theme } from "../stitches.config";

// CSS supports multiple gradients as backgrounds but not multiple colors
const backgroundColors = ({
  overlay,
  base,
}: {
  overlay: string;
  base: string;
}) =>
  `linear-gradient(${overlay}, ${overlay}), linear-gradient(${base}, ${base})`;

const backgroundStyle = (baseColor: string) => ({
  background: baseColor,
  "&:hover": {
    background: backgroundColors({
      base: baseColor,
      overlay: theme.colors.backgroundButtonHover,
    }),
  },
  "&:active": {
    background: backgroundColors({
      base: baseColor,
      overlay: theme.colors.backgroundButtonPressed,
    }),
  },
});

const StyledButton = styled("button", {
  all: "unset",
  boxSizing: "border-box",
  minWidth: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing[2],
  color: theme.colors.foregroundContrastMain,
  padding: `0 ${theme.spacing[4]}`,
  height: theme.spacing[12],
  borderRadius: theme.borderRadius[4],

  "&:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
    outlineOffset: "1px",
  },

  variants: {
    // "variant" is used instead of "type" as in Figma,
    // because type is already taken for type=submit etc.
    variant: {
      primary: { ...backgroundStyle(theme.colors.backgroundPrimary) },
      neutral: {
        ...backgroundStyle(theme.colors.backgroundNeutralMain),
        color: theme.colors.foregroundMain,
      },
      destructive: {
        ...backgroundStyle(theme.colors.backgroundDestructiveMain),
      },
      positive: { ...backgroundStyle(theme.colors.backgroundSuccessMain) },
      ghost: {
        ...backgroundStyle(theme.colors.backgroundHover),
        background: "transparent",
        color: theme.colors.foregroundMain,
      },
    },
    pending: {
      true: {
        cursor: "wait",
      },
      false: {
        "&[disabled]": {
          background: theme.colors.backgroundButtonDisabled,
          color: theme.colors.foregroundDisabled,
        },
      },
    },
  },

  defaultVariants: {
    variant: "primary",
  },
});

const TextContainer = styled("span", typography.labelTitleCase, {
  padding: `0 ${theme.spacing[2]}`,
});

type ButtonProps = {
  pending?: boolean;

  // prefix/suffix is primarily for Icons
  // this is a replacement for icon/icon-left/icon-right in Figma
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
} & Omit<ComponentProps<typeof StyledButton>, "pending" | "prefix">;

export const Button = forwardRef(
  (
    {
      pending = false,
      disabled = false,
      prefix,
      suffix,
      children,
      ...restProps
    }: ButtonProps,
    ref: Ref<HTMLButtonElement>
  ) => {
    return (
      <StyledButton
        {...restProps}
        pending={pending}
        disabled={disabled || pending}
        ref={ref}
      >
        {prefix}
        {children && (
          <TextContainer>
            {children}
            {pending ? "…" : ""}
          </TextContainer>
        )}
        {suffix}
      </StyledButton>
    );
  }
);
Button.displayName = "Button";
