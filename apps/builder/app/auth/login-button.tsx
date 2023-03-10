import type * as React from "react";
import { Tooltip } from "@webstudio-is/design-system";
import env from "~/shared/env";
import { BrandButton } from "./brand-button";

const isPreviewEnvironment = env.DEPLOYMENT_ENVIRONMENT === "preview";

export const LoginButton = ({
  children,
  isSecretLogin = false,
  disabled = false,
  icon,
  ...props
}: {
  children: React.ReactChild;
  isSecretLogin?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  icon: JSX.Element;
}) => {
  const isSocialLoginInPreviewEnvironment =
    isPreviewEnvironment && isSecretLogin === false;

  const button = (
    <BrandButton {...props} type="submit" disabled={disabled} icon={icon}>
      {children}
    </BrandButton>
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
