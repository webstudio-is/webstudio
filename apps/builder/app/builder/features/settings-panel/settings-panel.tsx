import type { Publish } from "~/shared/pubsub";
import { SettingsSection } from "./settings-section";
import type { Instance } from "@webstudio-is/project-build";
import { PropsSectionContainer } from "./props-section/props-section";

export const SettingsPanelContainer = ({
  selectedInstance,
  publish,
}: {
  publish: Publish;
  selectedInstance: Instance;
}) => {
  return (
    <>
      <SettingsSection />
      <PropsSectionContainer
        publish={publish}
        selectedInstance={selectedInstance}
      />
    </>
  );
};
