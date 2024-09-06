import { useStore } from "@nanostores/react";
import { buttonStyle, Text } from "@webstudio-is/design-system";
import { $authToken, $authTokenPermissions } from "~/shared/nano-states";
import { cloneProjectUrl } from "~/shared/router-utils/path-utils";

export const CloneButton = () => {
  const authTokenPermission = useStore($authTokenPermissions);
  const authToken = useStore($authToken);

  if (authToken === undefined || false === authTokenPermission.canClone) {
    return;
  }

  return (
    <a
      data-state="auto"
      className={buttonStyle({
        color: "positive",
      })}
      href={cloneProjectUrl({
        origin: window.origin,
        sourceAuthToken: authToken,
      })}
    >
      <Text css={{ pointerEvents: "none" }} variant={"labelsSentenceCase"}>
        Clone
      </Text>
    </a>
  );
};
