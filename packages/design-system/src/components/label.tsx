/**
 * Implementation of the "Label" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A3274
 */

import type { ComponentProps, ReactNode, Ref } from "react";
import { forwardRef } from "react";
import { textVariants } from "./text";
import { styled, theme } from "../stitches.config";
import { Label as RadixLabel } from "@radix-ui/react-label";
import { cssVar } from "../css-var";

const presetBackground = cssVar("--border-default");
const overwrittenBackground = `color-mix(in oklab, ${cssVar(
  "--background-negative"
)} 16%, ${cssVar("--background-primary")})`;

const withInteractionOverlay = (background: string) =>
  `linear-gradient(${cssVar("--overlay-interaction-hover")}, ${cssVar(
    "--overlay-interaction-hover"
  )}), ${background}`;

export const labelColors = [
  "default",
  "preset",
  "local",
  "overwritten",
  "remote",
  "inactive",
] as const;

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
  px: theme.spacing[2],
  border: "1px solid transparent",
  borderRadius: theme.borderRadius[3],
  transition: "150ms color, 150ms background-color",
  color: cssVar("--foreground-primary"),

  // https://github.com/webstudio-is/webstudio/issues/1271#issuecomment-1478436340
  "&:focus-visible": {
    outline: `2px solid ${cssVar("--border-focus")}`,
    outlineOffset: 1,
  },

  "&[aria-disabled=true]": {
    color: cssVar("--foreground-disabled"),
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
        color: cssVar("--foreground-primary"),
        "&:hover": {
          backgroundColor: cssVar("--overlay-interaction-hover"),
        },
      },
      preset: {
        backgroundColor: presetBackground,
        color: cssVar("--foreground-muted"),
        "&:hover": {
          background: withInteractionOverlay(presetBackground),
        },
      },
      local: {
        backgroundColor: cssVar("--background-informative-subtle"),
        color: cssVar("--foreground-informative"),
        "&:hover": {
          background: withInteractionOverlay(
            cssVar("--background-informative-subtle")
          ),
        },
      },
      overwritten: {
        backgroundColor: overwrittenBackground,
        color: cssVar("--foreground-negative"),
        "&:hover": {
          background: withInteractionOverlay(overwrittenBackground),
        },
      },
      remote: {
        backgroundColor: cssVar("--background-warning-subtle"),
        color: cssVar("--foreground-warning"),
        "&:hover": {
          background: withInteractionOverlay(
            cssVar("--background-warning-subtle")
          ),
        },
      },
      // Example is collapsible section title label when section has no content.
      inactive: {
        color: cssVar("--foreground-muted"),
        "&:hover": {
          color: cssVar("--foreground-primary"),
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
    text: {
      title: textVariants.titles,
      sentence: textVariants.labels,
      mono: textVariants.mono,
    },
  },

  defaultVariants: {
    text: "sentence",
  },
});

type Props = {
  tag?: "button" | "label";
  color?: (typeof labelColors)[number];
  text?: "title" | "sentence" | "mono";
  disabled?: boolean;
  truncate?: boolean;
  children: ReactNode;
} & ComponentProps<typeof StyledLabel>;

export const isLabelButton = (color: Props["color"]) => color !== undefined;

export const Label = forwardRef((props: Props, ref: Ref<HTMLLabelElement>) => {
  const { tag, disabled, children, ...rest } = props;

  // To enable keyboard accessibility for users who rely on the spacebar to activate the radix
  // when using a preset, locala, overwritten or remote color, we need to wrap the label with
  // a button that has a "label" role.
  // (Radix adds role="button" to the label)
  let isButton = isLabelButton(props.color) || tag === "button";
  // when explicit label
  if (tag === "label") {
    isButton = false;
  }

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
