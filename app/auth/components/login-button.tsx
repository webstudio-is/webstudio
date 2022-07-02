import React from "react";
import { Button, Tooltip } from "~/shared/design-system";
import env from "~/shared/env";

const isPreviewEnvironment = env.VERCEL_ENV === "preview";

export const LoginButton = ({
  children,
  isDevLogin = false,
  ...props
}: {
  children: React.ReactChild;
  isDevLogin?: boolean;
  onClick?: () => void;
}) => {
  if (isPreviewEnvironment && !isDevLogin) {
    <Tooltip
      content="Social login does not work in preview deployments"
      delayDuration={0}
    >
      <span tabIndex={0}>
        <Button {...props} css={{ width: "100%" }} type="submit" disabled>
          {children}
        </Button>
      </span>
    </Tooltip>;
  }
  return (
    <Button {...props} css={{ width: "100%" }} type="submit">
      {children}
    </Button>
  );
};
