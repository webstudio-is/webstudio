import type { Instance } from "@webstudio-is/sdk";
import { SettingsSection } from "./settings-section";
import { PropsSectionContainer } from "./props-section/props-section";
import { VariablesSection } from "./variables-section";
import {
  Box,
  Flex,
  Link,
  PanelBanner,
  Text,
  rawTheme,
  theme,
} from "@webstudio-is/design-system";
import { UpgradeIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import cmsUpgradeBanner from "./cms-upgrade-banner.svg?url";
import { $isDesignMode, $userPlanFeatures } from "~/shared/nano-states";

export const SettingsPanel = ({
  selectedInstance,
}: {
  selectedInstance: Instance;
}) => {
  const { allowDynamicData } = useStore($userPlanFeatures);
  const isDesignMode = useStore($isDesignMode);

  return (
    <Box css={{ pt: theme.spacing[5] }}>
      <SettingsSection />

      <PropsSectionContainer selectedInstance={selectedInstance} />

      {isDesignMode && <VariablesSection />}

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
    </Box>
  );
};
