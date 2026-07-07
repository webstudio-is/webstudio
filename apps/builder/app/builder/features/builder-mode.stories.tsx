import { StorySection, Toolbar } from "@webstudio-is/design-system";
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

export const BuilderMode = () => {
  $builderMode.set("design");
  $authPermit.set("own");
  $authToken.set(undefined);
  $planFeatures.set({
    ...$planFeatures.get(),
    allowContentMode: true,
  });

  return (
    <>
      <StorySection title="Design mode">
        <Toolbar>
          <BuilderModeDropDown />
        </Toolbar>
      </StorySection>

      <StorySection title="Preview mode">
        <Toolbar>
          <BuilderModeDropDown />
        </Toolbar>
      </StorySection>
    </>
  );
};
