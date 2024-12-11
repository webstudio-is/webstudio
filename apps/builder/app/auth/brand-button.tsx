import { css, textVariants, theme } from "@webstudio-is/design-system";
import type { ComponentProps, JSX } from "react";

export const buttonStyle = css({
  boxSizing: "border-box",
  minWidth: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing[5],
  height: theme.spacing[15],
  px: theme.spacing[9],
  borderRadius: 12,
  border: "2px solid transparent",
  whiteSpace: "nowrap",
  backgroundImage: `
    linear-gradient(${theme.colors.backgroundPanel}, ${theme.colors.backgroundPanel}),
    ${theme.colors.brandBorderFullGradient}
  `,
  backgroundOrigin: "border-box",
  backgroundClip: "padding-box, border-box",
  color: theme.colors.foregroundMain,
  boxShadow: theme.shadows.brandElevationSmall,
  ...textVariants.brandButtonRegular,
  "&:hover": {
    boxShadow: theme.shadows.brandElevationBig,
  },
  "&:focus-visible": {
    outline: `1px solid ${theme.colors.borderFocus}`,
    outlineOffset: 1,
  },
  "&:disabled": {
    boxShadow: "none",
    color: theme.colors.foregroundDisabled,
    borderColor: theme.colors.borderMain,
    "& svg": {
      opacity: "0.5",
    },
  },
});

type BrandButtonProps = ComponentProps<"button"> & {
  icon?: JSX.Element;
};

export const BrandButton = ({ icon, children, ...props }: BrandButtonProps) => {
  return (
    <button {...props} type="submit" className={buttonStyle()}>
      {icon}
      {children}
    </button>
  );
};
