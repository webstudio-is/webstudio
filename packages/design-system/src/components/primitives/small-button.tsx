import {
  forwardRef,
  type Ref,
  type ComponentProps,
  type ReactNode,
} from "react";
import { css, theme, type CSS } from "../../stitches.config";

export const smallButtonVariants = [
  "normal",
  "contrast",
  "destructive",
] as const;

/**
 * data-state from Radix, might be set when <SmallButton> is asChild
 * https://www.radix-ui.com/docs/primitives/components/popover#trigger
 **/
const smallButtonStates = ["open"] as const;

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

const perVariantStyle = (variant: (typeof smallButtonVariants)[number]) => ({
  color: defaultColors[variant],

  "&:hover, &[data-state=open]": {
    color: hoverColors[variant],

    "&:disabled, &[data-disabled]": {
      color: theme.colors.foregroundDisabled,
    },
  },
  "&[data-focused=true], &:focus-visible": {
    borderRadius: theme.borderRadius[3],
    outline: `2px solid ${focusColors[variant]}`,
    "&:disabled, &[data-disabled]": {
      outline: "none",
    },
  },
});

const style = css({
  all: "unset",
  width: theme.spacing[9],
  height: theme.spacing[9],
  "&:disabled, &[data-disabled]": {
    color: theme.colors.foregroundDisabled,
  },
  variants: {
    variant: {
      normal: perVariantStyle("normal"),
      contrast: perVariantStyle("contrast"),
      destructive: perVariantStyle("destructive"),
    },
  },
  defaultVariants: {
    variant: "normal",
  },
});

type Props = {
  children: ReactNode;
  variant?: (typeof smallButtonVariants)[number];
  "data-state"?: (typeof smallButtonStates)[number];
  "data-focused"?: boolean;
  css?: CSS;
} & Omit<ComponentProps<"button">, "children">;

export const SmallButton = forwardRef(
  (
    { variant, children, css, className, ...restProps }: Props,
    ref: Ref<HTMLButtonElement>
  ) => {
    return (
      <button
        {...restProps}
        className={style({ css, className, variant })}
        ref={ref}
      >
        {children}
      </button>
    );
  }
);
SmallButton.displayName = "SmallButton";
