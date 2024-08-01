import type { Instance } from "@webstudio-is/sdk";
import { SettingsSection } from "./settings-section";
import { PropsSectionContainer } from "./props-section/props-section";
import { VariablesSection } from "./variables-section";
import {
  Flex,
  Link,
  PanelBanner,
  Text,
  rawTheme,
} from "@webstudio-is/design-system";
import { UpgradeIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import { $userPlanFeatures } from "~/builder/shared/nano-states";
import cmsUpgradeBanner from "./cms-upgrade-banner.svg?url";

export const SettingsPanelContainer = ({
  selectedInstance,
}: {
  selectedInstance: Instance;
}) => {
  const { allowDynamicData } = useStore($userPlanFeatures);
  return (
    <>
      <SettingsSection />
      <PropsSectionContainer selectedInstance={selectedInstance} />
      <VariablesSection />
      {allowDynamicData === false && (
        <PanelBanner>
          <img
            src={cmsUpgradeBanner}
            alt="Upgrade for CMS"
            width={rawTheme.spacing[28]}
            style={{ aspectRatio: "4.1" }}
          />
          <Text variant="regularBold">Upgrade for CMS</Text>
          <Text>
            Integrate content from other tools to create blogs, directories, and
            any other structured content.
          </Text>
          <Flex align="center" gap={1}>
            <UpgradeIcon />
            <Link
              color="inherit"
              target="_blank"
              href="https://webstudio.is/pricing"
            >
              Upgrade to Pro
            </Link>
          </Flex>
        </PanelBanner>
      )}
    </>
  );
};
