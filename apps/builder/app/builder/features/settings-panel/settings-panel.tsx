import type { Publish } from "~/shared/pubsub";
import type { Instance } from "@webstudio-is/project-build";
import { SettingsSection } from "./settings-section/settings-section";
import { PropsSectionContainer } from "./props-section/props-section";
import { Tooltip } from "@webstudio-is/design-system";

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
      <Tooltip defaultOpen={true} content="This is a tooltip">
        <button>TEST</button>
      </Tooltip>

      <PropsSectionContainer
        publish={publish}
        selectedInstance={selectedInstance}
      />
    </>
  );
};
