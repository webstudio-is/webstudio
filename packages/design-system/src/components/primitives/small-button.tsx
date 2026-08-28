import {
  forwardRef,
  type Ref,
  type ComponentProps,
  type ReactNode,
} from "react";
import { css, theme, type CSS } from "../../stitches.config";
import { cssVar } from "../../css-var";

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

const contrastForeground = `light-dark(${cssVar(
  "--foreground-on-inverse"
)}, ${cssVar("--foreground-primary")})`;

const defaultColors = {
  normal: cssVar("--foreground-secondary"),
  destructive: cssVar("--foreground-secondary"),
  contrast: contrastForeground,
};

const hoverColors = {
  normal: cssVar("--foreground-primary"),
  destructive: cssVar("--foreground-negative"),
  contrast: contrastForeground,
};

const focusColors = {
  normal: cssVar("--border-focus"),
  destructive: cssVar("--border-focus"),
  contrast: contrastForeground,
};

const perVariantStyle = (variant: (typeof smallButtonVariants)[number]) => ({
  color: defaultColors[variant],

  "&:hover, &[data-state=open]": {
    color: hoverColors[variant],

    "&:disabled, &[data-disabled]": {
      color: cssVar("--foreground-disabled"),
    },
  },
  "&[data-focused=true], &:focus-visible": {
    borderRadius: theme.borderRadius[3],
    outline: `1px solid ${focusColors[variant]}`,
    "&:disabled, &[data-disabled]": {
      outline: "none",
    },
  },
});

const style = css({
  all: "unset",
  width: theme.spacing[9],
  height: theme.spacing[9],
  position: "relative",
  "&:disabled, &[data-disabled]": {
    color: cssVar("--foreground-disabled"),
  },
  variants: {
    variant: {
      normal: perVariantStyle("normal"),
      contrast: perVariantStyle("contrast"),
      destructive: perVariantStyle("destructive"),
    },
    bleed: {
      true: {
        // We want to bleed outside of the 16px icon size because its too small
        "&::after": {
          content: '""',
          position: "absolute",
          inset: `-${theme.spacing[4]}`,
        },
      },
    },
  },
  defaultVariants: {
    variant: "normal",
    bleed: true,
  },
});

type Props = {
  children: ReactNode;
  variant?: (typeof smallButtonVariants)[number];
  bleed?: boolean;
  "data-state"?: (typeof smallButtonStates)[number];
  "data-focused"?: boolean;
  css?: CSS;
} & Omit<ComponentProps<"button">, "children">;

export const SmallButton = forwardRef(
  (
    { variant, children, css, className, bleed, ...restProps }: Props,
    ref: Ref<HTMLButtonElement>
  ) => {
    return (
      <button
        type="button"
        {...restProps}
        className={style({ css, className, variant, bleed })}
        ref={ref}
      >
        {children}
      </button>
    );
  }
);
SmallButton.displayName = "SmallButton";
