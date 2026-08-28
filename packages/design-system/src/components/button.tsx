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
import { cssVar } from "../colors/css-var";

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

const backgrounds: Record<ButtonColor, string> = {
  primary: cssVar("--background-accent"),
  neutral: cssVar("--background-secondary"),
  "neutral-destructive": cssVar("--background-secondary"),
  destructive: cssVar("--background-negative"),
  positive: cssVar("--background-positive"),
  ghost: "transparent",
  dark: cssVar("--background-inverse"),
  gradient: `linear-gradient(135deg, ${cssVar("--background-accent")}, oklch(from ${cssVar("--background-accent")} l c calc(h + 72)))`,
  "dark-ghost": "transparent",
};

const hoverOverlays: Record<ButtonColor, string> = {
  primary: cssVar("--overlay-interaction-hover"),
  neutral: cssVar("--overlay-interaction-hover"),
  "neutral-destructive": cssVar("--overlay-interaction-hover"),
  destructive: cssVar("--overlay-interaction-hover"),
  positive: cssVar("--overlay-interaction-hover"),
  ghost: cssVar("--overlay-interaction-hover"),
  dark: cssVar("--overlay-on-inverse-hover"),
  gradient: cssVar("--overlay-interaction-hover"),
  "dark-ghost": cssVar("--overlay-on-inverse-hover"),
};

const pressedOverlays: Record<ButtonColor, string> = {
  primary: cssVar("--overlay-interaction-pressed"),
  neutral: cssVar("--overlay-interaction-pressed"),
  "neutral-destructive": cssVar("--overlay-interaction-pressed"),
  destructive: cssVar("--overlay-interaction-pressed"),
  positive: cssVar("--overlay-interaction-pressed"),
  ghost: cssVar("--overlay-interaction-pressed"),
  dark: cssVar("--overlay-on-inverse-pressed"),
  gradient: cssVar("--overlay-interaction-pressed"),
  "dark-ghost": cssVar("--overlay-on-inverse-pressed"),
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

const perColorStyle = (variant: ButtonColor) => ({
  background: backgrounds[variant],
  color: foregrounds[variant],

  "&[data-state=auto]:hover, &[data-state=hover]": {
    color: foregrounds[variant],
    background:
      variant === "ghost" || variant === "dark-ghost"
        ? hoverOverlays[variant]
        : withOverlay(hoverOverlays[variant], backgrounds[variant]),
  },

  "&[data-state=auto]:focus-visible, &[data-state=focus]": {
    color: foregrounds[variant],
    outline: `1px solid ${cssVar("--border-focus")}`,
    outlineOffset: "1px",
  },

  "&[data-state=auto]:active, &[data-state=pressed]": {
    color: foregrounds[variant],
    background:
      variant === "ghost" || variant === "dark-ghost"
        ? pressedOverlays[variant]
        : withOverlay(pressedOverlays[variant], backgrounds[variant]),
  },

  "&:disabled:not([data-state=pending]), &[data-state=disabled], &[aria-disabled=true], &[aria-disabled=true]:hover, &[aria-disabled=true]:visited":
    {
      background:
        variant === "dark" || variant === "dark-ghost"
          ? backgrounds[variant]
          : cssVar("--background-disabled"),
      color:
        variant === "dark" || variant === "dark-ghost"
          ? foregrounds[variant]
          : cssVar("--foreground-disabled"),
      opacity:
        variant === "dark" || variant === "dark-ghost"
          ? theme.opacity[1]
          : undefined,
    },

  "&[data-state=pending]": {
    cursor: "wait",
  },
});

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
