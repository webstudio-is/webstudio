import { useStore } from "@nanostores/react";
import { buttonStyle, Link } from "@webstudio-is/design-system";
import { $authToken, $authTokenPermissions } from "~/shared/nano-states";
import { cloneProjectUrl } from "~/shared/router-utils/path-utils";

export const CloneButton = () => {
  const authTokenPermission = useStore($authTokenPermissions);
  const authToken = useStore($authToken);

  if (authToken === undefined || false === authTokenPermission.canClone) {
    return;
  }

  return (
    <Link
      data-state="auto"
      className={buttonStyle({
        color: "positive",
      })}
      color="contrast"
      href={cloneProjectUrl({
        origin: window.origin,
        sourceAuthToken: authToken,
      })}
      underline="none"
    >
      Clone
    </Link>
  );
};
