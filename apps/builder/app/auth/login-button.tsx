import type * as React from "react";
import { css, Flex, textVariants, Tooltip } from "@webstudio-is/design-system";
import env from "~/shared/env";
import { theme } from "@webstudio-is/design-system";

const isPreviewEnvironment = env.DEPLOYMENT_ENVIRONMENT === "preview";

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
});

export const LoginButton = ({
  children,
  isDevLogin = false,
  disabled,
  icon,
  ...props
}: {
  children: React.ReactChild;
  isDevLogin?: boolean;
  onClick?: () => void;
  disabled: boolean;
  icon: JSX.Element;
}) => {
  const isSocialLoginInPreviewEnvironment =
    isPreviewEnvironment && isDevLogin === false;

  const button = (
    <button
      {...props}
      type="submit"
      disabled={disabled}
      color="neutral"
      className={buttonStyle()}
    >
      <Flex gap="2" align="center">
        {icon}
        {children}
      </Flex>
    </button>
  );

  if (isSocialLoginInPreviewEnvironment) {
    const content = disabled
      ? "Social login does not work in preview deployments"
      : "This login is not configured";

    return (
      <Tooltip content={content} delayDuration={0}>
        {button}
      </Tooltip>
    );
  }

  return button;
};
