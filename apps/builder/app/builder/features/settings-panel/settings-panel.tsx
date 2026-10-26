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
import cmsUpgradeBanner from "~/shared/cms-upgrade-banner.svg?url";
import { $isDesignMode, $permissions } from "~/shared/nano-states";
import { $dataSources, $instances, $props } from "~/shared/sync/data-stores";
import { ExpressionCompletionScopeContext } from "~/builder/shared/expression-editor";
import { getFormProgressCompletionScope } from "./form-context-preview";
import { useCallback } from "react";

export const SettingsPanel = ({
  selectedInstance,
  selectedInstanceKey,
}: {
  selectedInstance: Instance;
  selectedInstanceKey: string;
}) => {
  const { allowDynamicData } = useStore($permissions);
  const isDesignMode = useStore($isDesignMode);
  const instances = useStore($instances);
  const props = useStore($props);
  const dataSources = useStore($dataSources);
  const resolveCompletionScope = useCallback(
    (scope: Record<string, unknown>) =>
      getFormProgressCompletionScope({ instances, props, dataSources, scope }),
    [instances, props, dataSources]
  );

  return (
    <ExpressionCompletionScopeContext.Provider value={resolveCompletionScope}>
      <Box css={{ pt: theme.spacing[5] }}>
        <SettingsSection />

        <PropsSectionContainer
          selectedInstance={selectedInstance}
          selectedInstanceKey={selectedInstanceKey}
        />

        {isDesignMode && <VariablesSection />}

        {allowDynamicData === false && (
          <PanelBanner>
            <img
              src={cmsUpgradeBanner}
              alt="Upgrade for CMS"
              width={rawTheme.spacing[28]}
              style={{ aspectRatio: "4.1" }}
            />
            <Text variant="regularBold">Upgrade for CMS on custom domains</Text>
            <Text>
              Integrate content from other tools to create blogs, directories,
              and any other structured content. You can preview CMS on staging
              without upgrading.
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
    </ExpressionCompletionScopeContext.Provider>
  );
};
