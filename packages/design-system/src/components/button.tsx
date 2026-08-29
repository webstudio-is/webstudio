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
import { withInteractionOverlay } from "./control-state-color";

const colors = [
  "primary",
  "destructive",
  "neutral",
  "ghost",
  "neutral-destructive",
] as const;

export type ButtonColor = (typeof colors)[number];

export type ButtonState = "auto" | "hover" | "focus" | "pressed" | "pending";

const neutralBackground = `color-mix(in oklab, ${cssVar(
  "--background-primary"
)} 86%, ${cssVar("--foreground-primary")})`;
const disabledBackground = `color-mix(in oklab, ${cssVar(
  "--background-primary"
)} 92%, ${cssVar("--foreground-primary")})`;
const chromaticHoverOverlay = `oklch(from ${cssVar(
  "--foreground-on-accent"
)} 0 0 h / 6.2745%)`;
const chromaticPressedOverlay = `oklch(from ${cssVar(
  "--foreground-on-accent"
)} 0 0 h / 10.9804%)`;

const backgrounds: Record<ButtonColor, string> = {
  primary: cssVar("--background-accent"),
  neutral: neutralBackground,
  "neutral-destructive": neutralBackground,
  destructive: cssVar("--background-negative"),
  ghost: "transparent",
};

const foregrounds: Record<ButtonColor, string> = {
  primary: cssVar("--foreground-on-accent"),
  destructive: cssVar("--foreground-on-negative"),
  "neutral-destructive": cssVar("--foreground-negative"),
  neutral: cssVar("--foreground-primary"),
  ghost: cssVar("--foreground-primary"),
};

const perColorStyle = (variant: ButtonColor) => {
  const isTransparent = variant === "ghost";
  const isChromatic = variant === "primary" || variant === "destructive";
  let hoverOverlay = cssVar("--overlay-interaction-hover");
  let pressedOverlay = cssVar("--overlay-interaction-pressed");
  if (isChromatic) {
    hoverOverlay = chromaticHoverOverlay;
    pressedOverlay = chromaticPressedOverlay;
  }

  return {
    background: backgrounds[variant],
    color: foregrounds[variant],

    "&[data-state=auto]:hover, &[data-state=hover]": {
      color: foregrounds[variant],
      background: isTransparent
        ? hoverOverlay
        : withInteractionOverlay(backgrounds[variant], hoverOverlay),
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
        : withInteractionOverlay(backgrounds[variant], pressedOverlay),
    },

    "&:disabled:not([data-state=pending]), &[data-state=disabled], &[aria-disabled=true]:not([data-state=pending]), &[aria-disabled=true]:not([data-state=pending]):hover, &[aria-disabled=true]:not([data-state=pending]):visited":
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
      neutral: perColorStyle("neutral"),
      ghost: perColorStyle("ghost"),
    },
  },

  defaultVariants: {
    color: "neutral",
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

type ButtonVisualProps = {
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
};

export type ButtonProps = ButtonVisualProps &
  Omit<ComponentProps<"button">, "prefix" | "color">;

const ButtonContent = ({
  prefix,
  suffix,
  children,
  pending,
}: Pick<ButtonVisualProps, "prefix" | "suffix"> & {
  children?: ReactNode;
  pending: boolean;
}) => (
  <>
    {prefix}
    {children && (
      <TextContainer hidden={pending}>
        {children}
        {pending && (
          <Flex
            css={{
              position: "absolute",
              inset: 0,
              visibility: "visible",
              pointerEvents: "none",
            }}
            justify="center"
            align="center"
          >
            <LoadingDotsIcon size={28} fill="currentColor" />
          </Flex>
        )}
      </TextContainer>
    )}
    {suffix}
  </>
);

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
        <ButtonContent
          prefix={prefix}
          suffix={suffix}
          pending={state === "pending"}
        >
          {children}
        </ButtonContent>
      </button>
    );
  }
);
Button.displayName = "Button";

export type LinkButtonProps = ButtonVisualProps &
  Omit<ComponentProps<"a">, "prefix" | "color">;

export const LinkButton = forwardRef(
  (
    {
      state,
      prefix,
      suffix,
      children,
      "data-state": dataState,
      className,
      css,
      color,
      "aria-disabled": ariaDisabled,
      onClick,
      ...restProps
    }: LinkButtonProps,
    ref: Ref<HTMLAnchorElement>
  ) => {
    let finalState = dataState === "open" ? "pressed" : dataState;
    if (state !== undefined) {
      finalState = state;
    }

    const isDisabled = ariaDisabled === true || ariaDisabled === "true";
    if (isDisabled && state !== "pending") {
      finalState = "disabled";
    }

    return (
      <a
        {...restProps}
        aria-disabled={state === "pending" ? true : ariaDisabled}
        data-state={finalState ?? "auto"}
        ref={ref}
        className={buttonStyle({ color, className, css })}
        onClick={(event) => {
          if (isDisabled || state === "pending") {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
      >
        <ButtonContent
          prefix={prefix}
          suffix={suffix}
          pending={state === "pending"}
        >
          {children}
        </ButtonContent>
      </a>
    );
  }
);
LinkButton.displayName = "LinkButton";
