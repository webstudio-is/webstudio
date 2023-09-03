import {
  theme,
  Box,
  Card,
  Text,
  Separator,
  ScrollArea,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/sdk";
import type { Publish } from "~/shared/pubsub";

import { useStyleData } from "./shared/use-style-data";
import { StyleSettings } from "./style-settings";

import { StyleSourcesSection } from "./style-source-section";
import { selectedInstanceRenderStateStore } from "~/shared/nano-states";
import { useStore } from "@nanostores/react";

type StylePanelProps = {
  publish: Publish;
  selectedInstance: Instance;
};

export const StylePanel = ({ selectedInstance, publish }: StylePanelProps) => {
  const { currentStyle, setProperty, deleteProperty, createBatchUpdate } =
    useStyleData({
      selectedInstance,
      publish,
    });

  const selectedInstanceRenderState = useStore(
    selectedInstanceRenderStateStore
  );

  // If selected instance is not rendered on the canvas,
  // style panel will not work, because it needs the element in DOM in order to work.
  // See <SelectedInstanceConnector> for more details.
  if (selectedInstanceRenderState === "notMounted") {
    return (
      <Box css={{ p: theme.spacing[5] }}>
        <Card css={{ p: theme.spacing[9], width: "100%" }}>
          <Text>Select an instance on the canvas</Text>
        </Card>
      </Box>
    );
  }

  return (
    <>
      <Box
        css={{
          px: theme.spacing[9],
          pb: theme.spacing[9],
        }}
      >
        <Text css={{ py: theme.spacing[7] }} variant="titles">
          Style Sources
        </Text>
        <StyleSourcesSection />
      </Box>
      <Separator />
      <ScrollArea>
        <StyleSettings
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          createBatchUpdate={createBatchUpdate}
        />
      </ScrollArea>
    </>
  );
};
