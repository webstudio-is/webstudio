import { Toolbar } from "@webstudio-is/design-system";
import { BuilderModeDropDown } from "./builder-mode";
import {
  $builderMode,
  $authPermit,
  $authToken,
  $userPlanFeatures,
} from "~/shared/nano-states";

export default {
  title: "Builder Mode",
};

export const DesignMode = () => {
  $builderMode.set("design");
  $authPermit.set("own");
  $authToken.set(undefined);
  $userPlanFeatures.set({
    ...$userPlanFeatures.get(),
    allowContentMode: true,
  });
  return (
    <Toolbar>
      <BuilderModeDropDown />
    </Toolbar>
  );
};

export const ContentMode = () => {
  $builderMode.set("content");
  $authPermit.set("own");
  $authToken.set(undefined);
  $userPlanFeatures.set({
    ...$userPlanFeatures.get(),
    allowContentMode: true,
  });
  return (
    <Toolbar>
      <BuilderModeDropDown />
    </Toolbar>
  );
};

export const PreviewMode = () => {
  $builderMode.set("preview");
  $authPermit.set("own");
  $authToken.set(undefined);
  return (
    <Toolbar>
      <BuilderModeDropDown />
    </Toolbar>
  );
};

export const ContentModeOnly = () => {
  $builderMode.set("content");
  $authPermit.set("edit");
  $authToken.set(undefined);
  $userPlanFeatures.set({
    ...$userPlanFeatures.get(),
    allowContentMode: true,
  });
  return (
    <Toolbar>
      <BuilderModeDropDown />
    </Toolbar>
  );
};
