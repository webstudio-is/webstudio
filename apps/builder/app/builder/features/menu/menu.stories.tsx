import { Toolbar } from "@webstudio-is/design-system";
import { Menu } from "./menu";
import {
  $authPermit,
  $authToken,
  $authTokenPermissions,
  $builderMode,
  $userPlanFeatures,
} from "~/shared/nano-states";

export default {
  title: "Menu",
};

export const OwnerDesignMode = () => {
  $builderMode.set("design");
  $authPermit.set("own");
  $authToken.set(undefined);
  $authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: true,
  });
  $userPlanFeatures.set({
    ...$userPlanFeatures.get(),
    allowContentMode: true,
    purchases: [{ planName: "Pro" }],
  });
  return (
    <Toolbar>
      <Menu defaultOpen />
    </Toolbar>
  );
};

export const ViewerFreePlan = () => {
  $builderMode.set("content");
  $authPermit.set("view");
  $authToken.set("some-token");
  $authTokenPermissions.set({
    canClone: false,
    canCopy: false,
    canPublish: false,
  });
  return (
    <Toolbar>
      <Menu defaultOpen />
    </Toolbar>
  );
};

export const AdminContentMode = () => {
  $builderMode.set("content");
  $authPermit.set("admin");
  $authToken.set(undefined);
  $authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: true,
  });
  $userPlanFeatures.set({
    ...$userPlanFeatures.get(),
    allowContentMode: true,
    purchases: [{ planName: "Pro" }],
  });
  return (
    <Toolbar>
      <Menu defaultOpen />
    </Toolbar>
  );
};
