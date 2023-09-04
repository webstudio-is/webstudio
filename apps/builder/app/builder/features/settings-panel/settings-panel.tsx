import type { Instance } from "@webstudio-is/sdk";
import type { Publish } from "~/shared/pubsub";
import { SettingsSection } from "./settings-section/settings-section";
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
