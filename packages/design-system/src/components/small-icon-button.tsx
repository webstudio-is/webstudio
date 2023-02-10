/**
 * Implementation of the "Small Icon Button" component from:
 * https://www.figma.com/file/sfCE7iLS0k25qCxiifQNLE/%F0%9F%93%9A-Webstudio-Library?node-id=4%3A3171
 */

import {
  forwardRef,
  type Ref,
  type ComponentProps,
  type ReactNode,
} from "react";
import { css, theme, type CSS } from "../stitches.config";

export const smallIconButtonVariants = [
  "normal",
  "contrast",
  "destructive",
] as const;

export const smallIconButtonStates = ["auto", "default", "hover"] as const;

const defaultColors = {
  normal: theme.colors.foregroundSubtle,
  destructive: theme.colors.foregroundSubtle,
  contrast: theme.colors.foregroundContrastMain,
};

const hoverColors = {
  normal: theme.colors.foregroundMain,
  destructive: theme.colors.foregroundDestructive,
  contrast: theme.colors.foregroundContrastMain,
};

const focusColors = {
  normal: theme.colors.borderFocus,
  destructive: theme.colors.borderFocus,
  contrast: theme.colors.borderContrast,
};

const perVariantStyle = (variant: typeof smallIconButtonVariants[number]) => ({
  "&[data-state=auto], &[data-state=default]": {
    color: defaultColors[variant],
  },
  "&[data-state=auto]:hover, &[data-state=hover]": {
    color: hoverColors[variant],
  },
  "&[data-focused=true], &:focus-visible": {
    borderRadius: theme.borderRadius[3],
    outline: `2px solid ${focusColors[variant]}`,
  },
});

const styles = css({
  all: "unset",
  width: theme.spacing[9],
  height: theme.spacing[9],
  variants: {
    variant: {
      normal: perVariantStyle("normal"),
      contrast: perVariantStyle("contrast"),
      destructive: perVariantStyle("destructive"),
    },
  },
});

type Props = {
  icon: ReactNode;
  variant?: typeof smallIconButtonVariants[number];
  state?: typeof smallIconButtonStates[number];
  focused?: boolean;
  css?: CSS;

  // might be set when <SmallIconButton> is asChild
  "data-state"?: string;
} & Omit<ComponentProps<"button">, "children">;

export const SmallIconButton = forwardRef(
  (
    {
      state,
      focused,
      variant,
      icon,
      css,
      className,
      "data-state": dataState,
      ...restProps
    }: Props,
    ref: Ref<HTMLButtonElement>
  ) => {
    // when button is used as a trigger for something that opens
    // <SomeTrigger asChild><SmallIconButton /></SomeTrigger>
    let finalState = dataState === "open" ? "hover" : undefined;

    // "state" wins over "data-state"
    if (state !== undefined) {
      finalState = state;
    }

    return (
      <button
        {...restProps}
        className={styles({ css, className, variant })}
        data-state={finalState ?? "auto"}
        data-focused={focused}
        ref={ref}
      >
        {icon}
      </button>
    );
  }
);
SmallIconButton.displayName = "SmallIconButton";
