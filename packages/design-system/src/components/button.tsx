/**
 * Implementation of the "Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A2709
 */

import {
  forwardRef,
  type Ref,
  type ComponentProps,
  type ReactNode,
} from "react";
import { textVariants } from "./text";
import { styled, theme } from "../stitches.config";

const colors = [
  "primary",
  "destructive",
  "positive",
  "neutral",
  "ghost",
  "dark",
  "gradient",
  "neutral-destructive",
] as const;

type ButtonColor = (typeof colors)[number];

type ButtonState = "auto" | "hover" | "focus" | "pressed" | "pending";

const backgrounds: Record<ButtonColor, string> = {
  primary: theme.colors.backgroundPrimary,
  neutral: theme.colors.backgroundNeutralMain,
  "neutral-destructive": theme.colors.backgroundNeutralMain,
  destructive: theme.colors.backgroundDestructiveMain,
  positive: theme.colors.backgroundSuccessMain,
  ghost: theme.colors.backgroundHover,
  dark: theme.colors.backgroundTopbar,
  gradient: theme.colors.backgroundGradientPrimary,
};

const foregrounds: Record<ButtonColor, string> = {
  primary: theme.colors.foregroundContrastMain,
  destructive: theme.colors.foregroundContrastMain,
  "neutral-destructive": theme.colors.foregroundDestructive,
  positive: theme.colors.foregroundContrastMain,
  neutral: theme.colors.foregroundMain,
  ghost: theme.colors.foregroundMain,
  dark: theme.colors.foregroundContrastMain,
  gradient: theme.colors.foregroundContrastMain,
};

// CSS supports multiple gradients as backgrounds but not multiple colors
const backgroundColors = (base: string, overlay: string) =>
  `linear-gradient(${overlay}, ${overlay}), linear-gradient(${base}, ${base})`;

const perColorStyle = (variant: ButtonColor) => ({
  background: variant === "ghost" ? "transparent" : backgrounds[variant],
  color: foregrounds[variant],

  "&[data-state=auto]:hover, &[data-state=hover]": {
    background:
      variant === "gradient"
        ? `linear-gradient(${theme.colors.backgroundButtonHover}, ${theme.colors.backgroundButtonHover}), ${backgrounds[variant]}`
        : backgroundColors(
            backgrounds[variant],
            theme.colors.backgroundButtonHover
          ),
  },

  "&[data-state=auto]:focus-visible, &[data-state=focus]": {
    outline: `2px solid ${theme.colors.borderFocus}`,
    outlineOffset: "1px",
  },

  "&[data-state=auto]:active, &[data-state=pressed]": {
    background:
      variant === "gradient"
        ? `linear-gradient(${theme.colors.backgroundButtonPressed}, ${theme.colors.backgroundButtonPressed}), ${backgrounds[variant]}`
        : backgroundColors(
            backgrounds[variant],
            theme.colors.backgroundButtonPressed
          ),
  },

  "&[data-state=disabled]": {
    background: theme.colors.backgroundButtonDisabled,
    color: theme.colors.foregroundDisabled,
  },

  "&[data-state=pending]": {
    cursor: "wait",
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
  padding: `0 ${theme.spacing[4]}`,
  height: theme.spacing[12],
  borderRadius: theme.borderRadius[4],
  whiteSpace: "nowrap",

  variants: {
    color: {
      primary: perColorStyle("primary"),
      destructive: perColorStyle("destructive"),
      "neutral-destructive": perColorStyle("neutral-destructive"),
      positive: perColorStyle("positive"),
      neutral: perColorStyle("neutral"),
      ghost: perColorStyle("ghost"),
      dark: perColorStyle("dark"),
      gradient: perColorStyle("gradient"),
    },
  },

  defaultVariants: {
    color: "primary",
  },
});

const TextContainer = styled("span", textVariants.labelsSentenceCase, {
  padding: `0 ${theme.spacing[2]}`,
  overflow: "hidden",
  textOverflow: "ellipsis",
});

type ButtonProps = {
  state?: ButtonState;
  color?: ButtonColor;

  // We don't want all the noise from StyledButton,
  // so we're cherry-picking just the props we need
  css?: ComponentProps<typeof StyledButton>["css"];

  // prefix/suffix are primarily for Icons
  // this is a replacement for icon/icon-left/icon-right in Figma
  prefix?: ReactNode;
  suffix?: ReactNode;

  // might be set when <Button> is asChild
  "data-state"?: string;
} & Omit<ComponentProps<"button">, "prefix">;

export const Button = forwardRef(
  (
    {
      disabled,
      state,
      prefix,
      suffix,
      children,
      "data-state": dataState,
      ...restProps
    }: ButtonProps,
    ref: Ref<HTMLButtonElement>
  ) => {
    // when button is used as a trigger for something that opens
    // <SomeTrigger asChild><Button /></SomeTrigger>
    let finalState = dataState === "open" ? "pressed" : undefined;

    // "state" wins over "data-state"
    if (state !== undefined) {
      finalState = state;
    }

    // "disabled" wins over everything
    if (disabled) {
      finalState = "disabled";
    }

    return (
      <StyledButton
        {...restProps}
        disabled={disabled || state === "pending"}
        data-state={finalState ?? "auto"}
        ref={ref}
      >
        {prefix}
        {children && (
          <TextContainer>
            {children}
            {state === "pending" ? "…" : ""}
          </TextContainer>
        )}
        {suffix}
      </StyledButton>
    );
  }
);
Button.displayName = "Button";
