/**
 * Implementation of the "Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=0%3A1
 */

import React, { forwardRef, type Ref, type ComponentProps } from "react";
import { Text } from "./text";
import { styled } from "../stitches.config";

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
      overlay: "$colors$backgroundButtonHover",
    }),
  },
  "&:active": {
    background: backgroundColors({
      base: baseColor,
      overlay: "$colors$backgroundButtonPressed",
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
  gap: "$spacing$2",
  color: "$colors$foregroundContrastMain",
  padding: "0 $spacing$4",
  height: "$spacing$12",
  borderRadius: "$borderRadius$4",

  "&:focus-visible": {
    outline: "2px solid $colors$borderFocus",
    outlineOffset: "1px",
  },

  variants: {
    // "variant" is used instead of "type" as in Figma,
    // because type is already taken for type=submit etc.
    variant: {
      primary: { ...backgroundStyle("$colors$backgroundPrimary") },
      neutral: {
        ...backgroundStyle("$colors$backgroundNeutralMain"),
        color: "$colors$foregroundMain",
      },
      destructive: { ...backgroundStyle("$colors$backgroundDestructiveMain") },
      positive: { ...backgroundStyle("$colors$backgroundSuccessMain") },
      ghost: {
        ...backgroundStyle("$colors$backgroundHover"),
        background: "transparent",
        color: "$colors$foregroundMain",
      },
    },
    pending: {
      true: {
        cursor: "wait",
      },
      false: {
        "&[disabled]": {
          background: "$colors$backgroundButtonDisabled",
          color: "$colors$foregroundDisabled",
        },
      },
    },
  },

  defaultVariants: {
    variant: "primary",
  },
});

const TextContainer = styled(Text, {
  padding: "0 $spacing$2",
  // <Text> incorrectly sets lineHeight to 1 for all variants
  // here we set lineHeight as it's defined for "label" in Figma
  // @todo: fix <Text>
  lineHeight: "$lineHeight$3",
  defaultVariants: { variant: "label" },
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
