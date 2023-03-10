import { css, Flex, textVariants, theme } from "@webstudio-is/design-system";
import type { ComponentProps } from "react";

const buttonStyle = css({
  width: "fit-content",
  height: theme.spacing[15],
  px: theme.spacing[9],
  borderRadius: 12,
  border: "2px solid transparent",
  backgroundImage: `
    linear-gradient(${theme.colors.brandBackgroundProjectCardTextArea}, ${theme.colors.brandBackgroundProjectCardTextArea}), 
    ${theme.colors.brandBorderFullGradient}
  `,
  backgroundOrigin: "border-box",
  backgroundClip: "padding-box, border-box",
  ...textVariants.brandButtonRegular,
  "&:hover:not(:disabled)": {
    boxShadow: theme.shadows.brandElevationBig,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.colors.borderFocus}`,
    outlineOffset: 1,
  },
});

type BrandButtonProps = ComponentProps<"button"> & {
  icon: JSX.Element;
};

export const BrandButton = ({ icon, children, ...props }: BrandButtonProps) => {
  return (
    <button {...props} type="submit" color="neutral" className={buttonStyle()}>
      <Flex gap="2" align="center">
        {icon}
        {children}
      </Flex>
    </button>
  );
};
