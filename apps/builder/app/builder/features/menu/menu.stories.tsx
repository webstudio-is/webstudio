import { Flex, StorySection, Text, Toolbar } from "@webstudio-is/design-system";
import { Menu } from "./menu";
import {
  $authPermit,
  $authToken,
  $authTokenPermissions,
  $builderMode,
  $purchases,
  $planFeatures,
} from "~/shared/nano-states";

export default {
  title: "Menu",
};

const OwnerDesignModeVariant = () => {
  $builderMode.set("design");
  $authPermit.set("own");
  $authToken.set(undefined);
  $authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: true,
  });
  $planFeatures.set({
    ...$planFeatures.get(),
    allowContentMode: true,
  });
  $purchases.set([{ planName: "Pro" }]);
  return (
    <Toolbar>
      <Menu defaultOpen />
    </Toolbar>
  );
};

const ViewerFreePlanVariant = () => {
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

const AdminContentModeVariant = () => {
  $builderMode.set("content");
  $authPermit.set("admin");
  $authToken.set(undefined);
  $authTokenPermissions.set({
    canClone: true,
    canCopy: true,
    canPublish: true,
  });
  $planFeatures.set({
    ...$planFeatures.get(),
    allowContentMode: true,
  });
  $purchases.set([{ planName: "Pro" }]);
  return (
    <Toolbar>
      <Menu defaultOpen />
    </Toolbar>
  );
};

export const MenuStory = () => (
  <StorySection title="Menu">
    <Flex direction="column" gap="5">
      <Flex direction="column" gap="5">
        <Text variant="labels">Owner design mode</Text>
        <OwnerDesignModeVariant />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">Viewer free plan</Text>
        <ViewerFreePlanVariant />
      </Flex>
      <Flex direction="column" gap="5">
        <Text variant="labels">Admin content mode</Text>
        <AdminContentModeVariant />
      </Flex>
    </Flex>
  </StorySection>
);
