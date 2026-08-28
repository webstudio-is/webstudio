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
import { css, styled, theme, type CSS } from "../stitches.config";
import { LoadingDotsIcon } from "@webstudio-is/icons";
import { Flex } from "./flex";
import { cssVar } from "../css-var";

const colors = [
  "primary",
  "destructive",
  "positive",
  "neutral",
  "ghost",
  "dark",
  "gradient",
  "neutral-destructive",
  "dark-ghost",
] as const;

type ButtonColor = (typeof colors)[number];

type ButtonState = "auto" | "hover" | "focus" | "pressed" | "pending";

const neutralBackground = `color-mix(in oklab, ${cssVar("--background-primary")} 83%, ${cssVar("--foreground-primary")})`;
const darkBackground = `color-mix(in oklab, ${cssVar("--background-inverse")} 90%, ${cssVar("--background-primary")})`;
const disabledBackground = `color-mix(in oklab, ${cssVar("--background-primary")} 92%, ${cssVar("--foreground-primary")})`;

const backgrounds: Record<ButtonColor, string> = {
  primary: cssVar("--background-accent"),
  neutral: neutralBackground,
  "neutral-destructive": neutralBackground,
  destructive: cssVar("--background-negative"),
  positive: cssVar("--background-positive"),
  ghost: "transparent",
  dark: darkBackground,
  gradient: `linear-gradient(135deg, ${cssVar("--background-accent")}, oklch(from ${cssVar("--background-accent")} l c calc(h + 72)))`,
  "dark-ghost": "transparent",
};

const foregrounds: Record<ButtonColor, string> = {
  primary: cssVar("--foreground-on-accent"),
  destructive: cssVar("--foreground-on-negative"),
  "neutral-destructive": cssVar("--foreground-negative"),
  positive: cssVar("--foreground-on-positive"),
  neutral: cssVar("--foreground-primary"),
  ghost: cssVar("--foreground-primary"),
  dark: cssVar("--foreground-on-inverse"),
  gradient: cssVar("--foreground-on-accent"),
  "dark-ghost": cssVar("--foreground-on-inverse"),
};

const withOverlay = (overlay: string, background: string) =>
  `linear-gradient(${overlay}, ${overlay}), ${background}`;

const perColorStyle = (variant: ButtonColor) => {
  const isInverse = variant === "dark" || variant === "dark-ghost";
  const isTransparent = variant === "ghost" || variant === "dark-ghost";
  const isGradient = variant === "gradient";
  const hoverOverlay = isInverse
    ? cssVar("--overlay-on-inverse-hover")
    : cssVar("--overlay-interaction-hover");
  const pressedOverlay = isInverse
    ? cssVar("--overlay-on-inverse-pressed")
    : cssVar("--overlay-interaction-pressed");

  return {
    background: backgrounds[variant],
    color:
      variant === "dark-ghost"
        ? cssVar("--foreground-secondary")
        : foregrounds[variant],

    "&[data-state=auto]:hover, &[data-state=hover]": {
      color: foregrounds[variant],
      background: isTransparent
        ? hoverOverlay
        : isGradient
          ? withOverlay(hoverOverlay, backgrounds[variant])
          : `oklch(from ${backgrounds[variant]} l c h / 0.8)`,
    },

    "&[data-state=auto]:focus-visible, &[data-state=focus]": {
      color: foregrounds[variant],
      outline: `1px solid ${cssVar("--border-focus")}`,
      outlineOffset: "1px",
    },

    "&[data-state=auto]:active, &[data-state=pressed]": {
      color: foregrounds[variant],
      background: isTransparent
        ? pressedOverlay
        : isGradient
          ? withOverlay(pressedOverlay, backgrounds[variant])
          : `oklch(from ${backgrounds[variant]} l c h / 0.8)`,
    },

    "&:disabled:not([data-state=pending]), &[data-state=disabled], &[aria-disabled=true], &[aria-disabled=true]:hover, &[aria-disabled=true]:visited":
      {
        background: disabledBackground,
        color: cssVar("--foreground-disabled"),
      },

    "&[data-state=pending]": {
      cursor: "wait",
    },
  };
};

export const buttonStyle = css({
  all: "unset",
  boxSizing: "border-box",
  minWidth: 0,
  display: "inline-grid",
  gridAutoFlow: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing[2],
  padding: `0 ${theme.spacing[3]}`,
  height: theme.sizes.controlHeight,
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
      "dark-ghost": perColorStyle("dark-ghost"),
    },
  },

  defaultVariants: {
    color: "primary",
  },
});

const TextContainer = styled("span", textVariants.labels, {
  padding: `0 ${theme.spacing[2]}`,
  overflow: "hidden",
  textOverflow: "ellipsis",
  position: "relative",
  variants: {
    // "hidden" is used to hide the text when the button is in a pending state but preserving the button size
    hidden: {
      true: {
        visibility: "hidden",
      },
    },
  },
});

type ButtonProps = {
  state?: ButtonState;
  color?: ButtonColor;

  // We don't want all the noise from StyledButton,
  // so we're cherry-picking just the props we need
  css?: CSS;

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
      className,
      css,
      color,
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
      <button
        {...restProps}
        disabled={disabled || state === "pending"}
        data-state={finalState ?? "auto"}
        ref={ref}
        className={buttonStyle({ color, className, css })}
      >
        {prefix}
        {children && (
          <TextContainer hidden={state === "pending"}>
            {children}
            {state === "pending" && (
              <Flex
                css={{
                  position: "absolute",
                  inset: 0,
                  visibility: "visible",
                  pointerEvents: "none",
                }}
                justify={"center"}
                align={"center"}
              >
                <LoadingDotsIcon size={28} fill="currentColor" />
              </Flex>
            )}
          </TextContainer>
        )}

        {suffix}
      </button>
    );
  }
);
Button.displayName = "Button";
