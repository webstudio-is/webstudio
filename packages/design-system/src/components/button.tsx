/**
 * Implementation of the "Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A2709
 */

import React, { forwardRef, type Ref, type ComponentProps } from "react";
import { typography } from "./typography";
import { styled, theme } from "../stitches.config";

const variants = [
  "primary",
  "destructive",
  "positive",
  "neutral",
  "ghost",
] as const;

type Variant = typeof variants[number];

const bg: Record<Variant, string> = {
  primary: theme.colors.backgroundPrimary,
  neutral: theme.colors.backgroundNeutralMain,
  destructive: theme.colors.backgroundDestructiveMain,
  positive: theme.colors.backgroundSuccessMain,
  ghost: theme.colors.backgroundHover,
};

const fg: Record<Variant, string> = {
  primary: theme.colors.foregroundContrastMain,
  destructive: theme.colors.foregroundContrastMain,
  positive: theme.colors.foregroundContrastMain,
  neutral: theme.colors.foregroundMain,
  ghost: theme.colors.foregroundMain,
} as const;

// CSS supports multiple gradients as backgrounds but not multiple colors
const backgroundColors = (base: string, overlay: string) =>
  `linear-gradient(${overlay}, ${overlay}), linear-gradient(${base}, ${base})`;

const presedStyle = (variant: Variant) => ({
  background: backgroundColors(
    bg[variant],
    theme.colors.backgroundButtonPressed
  ),
});

const varianStyle = (variant: Variant) => ({
  background: bg[variant],
  color: fg[variant],
  "&:hover": {
    background: backgroundColors(
      bg[variant],
      theme.colors.backgroundButtonHover
    ),
  },
  "&:active": presedStyle(variant),
});

const StyledButton = styled("button", {
  all: "unset",
  boxSizing: "border-box",
  minWidth: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing[2],
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
      primary: varianStyle("primary"),
      destructive: varianStyle("destructive"),
      positive: varianStyle("positive"),
      neutral: varianStyle("neutral"),
      ghost: { ...varianStyle("ghost"), background: "transparent" },
    },
    pending: {
      true: { cursor: "wait" },
      false: {
        "&[disabled]": {
          background: theme.colors.backgroundButtonDisabled,
          color: theme.colors.foregroundDisabled,
        },
      },
    },

    // styles are defined in "compoundVariants"
    pressed: { true: {} },
  },

  compoundVariants: variants.map((variant) => ({
    pressed: true,
    variant,
    css: { ...presedStyle(variant), "&:hover": presedStyle(variant) },
  })),

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
