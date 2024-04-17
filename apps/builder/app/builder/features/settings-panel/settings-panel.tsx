import type { Instance } from "@webstudio-is/sdk";
import { SettingsSection } from "./settings-section";
import { PropsSectionContainer } from "./props-section/props-section";
import { VariablesSection } from "./variables-section";

export const SettingsPanelContainer = ({
  selectedInstance,
}: {
  selectedInstance: Instance;
}) => {
  return (
    <>
      <SettingsSection />
      <PropsSectionContainer selectedInstance={selectedInstance} />
      <VariablesSection />
    </>
  );
};
