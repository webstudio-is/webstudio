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
  return <BuilderModeDropDown />;
};

export const ContentMode = () => {
  $builderMode.set("content");
  $authPermit.set("own");
  $authToken.set(undefined);
  $userPlanFeatures.set({
    ...$userPlanFeatures.get(),
    allowContentMode: true,
  });
  return <BuilderModeDropDown />;
};

export const PreviewMode = () => {
  $builderMode.set("preview");
  $authPermit.set("own");
  $authToken.set(undefined);
  return <BuilderModeDropDown />;
};

export const ContentModeOnly = () => {
  $builderMode.set("content");
  $authPermit.set("edit");
  $authToken.set(undefined);
  $userPlanFeatures.set({
    ...$userPlanFeatures.get(),
    allowContentMode: true,
  });
  return <BuilderModeDropDown />;
};
