import type { Instance } from "@webstudio-is/sdk";

import {
  Box,
  Flex,
  Link,
  PanelBanner,
  Text,
} from "@webstudio-is/design-system";
import { UpgradeIcon } from "@webstudio-is/icons";
import { useStore } from "@nanostores/react";
import { $userPlanFeatures } from "~/shared/nano-states";
import { InteractionSection } from "./interaction-section";

export const InteractionsPanel = ({
  selectedInstance,
  selectedInstanceKey,
}: {
  selectedInstance: Instance;
  selectedInstanceKey: string;
}) => {
  const { hasProPlan } = useStore($userPlanFeatures);

  return (
    <Box>
      {hasProPlan && (
        <fieldset style={{ display: "contents" }}>
          <InteractionSection
            selectedInstance={selectedInstance}
            selectedInstanceKey={selectedInstanceKey}
          />
        </fieldset>
      )}

      {hasProPlan === false && (
        <PanelBanner>
          <Text variant="regularBold">Upgrade to unlock Interactions</Text>
          <Text>Create engaging view and scroll animations</Text>
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
