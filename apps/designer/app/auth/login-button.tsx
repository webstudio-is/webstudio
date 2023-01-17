import React from "react";
import { Button, Flex, Tooltip } from "@webstudio-is/design-system";
import env from "~/shared/env";
import { theme } from "@webstudio-is/design-system";

const isPreviewEnvironment = env.VERCEL_ENV === "preview";

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
    <Button
      {...props}
      type="submit"
      disabled={disabled}
      variant="neutral"
      css={{ width: "100%" }}
    >
      <Flex gap="2" align="center">
        <Flex css={{ size: theme.spacing[10] }}>{icon}</Flex>
        {children}
      </Flex>
    </Button>
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
