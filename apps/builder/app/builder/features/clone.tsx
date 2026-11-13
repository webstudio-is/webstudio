import { useStore } from "@nanostores/react";
import { LinkButton } from "@webstudio-is/design-system";
import { $authToken, $authTokenPermissions } from "~/shared/nano-states";
import { cloneProjectUrl } from "~/shared/router-utils/path-utils";

export const CloneButton = () => {
  const authTokenPermission = useStore($authTokenPermissions);
  const authToken = useStore($authToken);

  if (authToken === undefined || false === authTokenPermission.canClone) {
    return;
  }

  return (
    <LinkButton
      href={cloneProjectUrl({
        origin: window.origin,
        sourceAuthToken: authToken,
      })}
    >
      Clone
    </LinkButton>
  );
};

undefined;
