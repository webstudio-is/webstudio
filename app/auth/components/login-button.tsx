import React from "react";
import { Button, Tooltip } from "~/shared/design-system";
import env from "~/shared/env";

const isPreviewEnvironment = env.VERCEL_ENV === "preview";

export const LoginButton = ({
  children,
  isDevLogin = false,
  enabled,
  ...props
}: {
  children: React.ReactChild;
  isDevLogin?: boolean;
  onClick?: () => void;
  enabled: boolean;
}) => {
  const showTooltip =
    (isPreviewEnvironment || enabled === false) && isDevLogin === false;
  if (showTooltip) {
    const content = isPreviewEnvironment
      ? "Social login does not work in preview deployments"
      : "This login is not configured";

    return (
      <Tooltip content={content} delayDuration={0}>
        <span tabIndex={0}>
          <Button
            {...props}
            css={{ width: "100%" }}
            size={3}
            type="submit"
            disabled
          >
            {children}
          </Button>
        </span>
      </Tooltip>
    );
  }
  return (
    <Button {...props} css={{ width: "100%" }} size={3} type="submit">
      {children}
    </Button>
  );
};
