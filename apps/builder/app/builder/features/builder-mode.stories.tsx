import { Flex, StorySection } from "@webstudio-is/design-system";
import { BuilderModeDropDown } from "./builder-mode";
import {
  $builderMode,
  $authPermit,
  $authToken,
  $planFeatures,
} from "~/shared/nano-states";

export default {
  title: "Builder mode",
};

const renderBuilderMode = (mode: "design" | "preview") => {
  $builderMode.set(mode);
  $authPermit.set("own");
  $authToken.set(undefined);
  $planFeatures.set({
    ...$planFeatures.get(),
    allowContentMode: true,
  });

  return <BuilderModeDropDown />;
};

export const DesignMode = () => (
  <StorySection title="Design mode">
    <Flex align="center">{renderBuilderMode("design")}</Flex>
  </StorySection>
);

export const PreviewMode = () => (
  <StorySection title="Preview mode">
    <Flex align="center">{renderBuilderMode("preview")}</Flex>
  </StorySection>
);
