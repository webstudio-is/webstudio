import type { LabelHTMLAttributes, ReactNode, Ref } from "react";
import { forwardRef } from "react";
import { typography } from "../__generated__/figma-design-tokens";
import { styled, theme } from "../stitches.config";

const StyledLabel = styled("label", typography.labelsSentenceCase, {
  boxSizing: "border-box",
  flexShrink: 0,
  py: 2,
  border: "1px solid transparent",
  borderRadius: theme.borderRadius[3],

  "&:focus-visible": {
    outline: `2px solid ${theme.colors.blue10}`,
  },

  variants: {
    color: {
      default: {
        color: theme.colors.foregroundMain,
        "&[aria-disabled=true]": {
          color: theme.colors.foregroundDisabled,
        },
      },
      preset: {
        px: 4,
        backgroundColor: theme.colors.backgroundPresetMain,
        borderColor: theme.colors.borderMain,
        color: theme.colors.foregroundMain,
        "&:hover": {
          backgroundColor: theme.colors.backgroundPresetHover,
        },
      },
      local: {
        px: 4,
        backgroundColor: theme.colors.backgroundSetMain,
        borderColor: theme.colors.borderSetMain,
        color: theme.colors.foregroundSetMain,
        "&:hover": {
          backgroundColor: theme.colors.backgroundSetHover,
        },
      },
      remote: {
        px: 4,
        backgroundColor: theme.colors.backgroundInheritedMain,
        borderColor: theme.colors.borderInheritedMain,
        color: theme.colors.foregroundInheritedMain,
        "&:hover": {
          backgroundColor: theme.colors.backgroundInheritedHover,
        },
      },
    },
  },

  defaultVariants: {
    color: "default",
  },
});

type Props = LabelHTMLAttributes<HTMLLabelElement> & {
  color?: "default" | "preset" | "local" | "remote";
  disabled?: boolean;
  children: ReactNode;
};

export const Label = forwardRef((props: Props, ref: Ref<HTMLLabelElement>) => {
  const { color, disabled, children, ...rest } = props;
  return (
    <StyledLabel ref={ref} color={color} aria-disabled={disabled} {...rest}>
      {children}
    </StyledLabel>
  );
});

Label.displayName = "Label";
