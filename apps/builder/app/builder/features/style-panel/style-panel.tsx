import { theme, Box, ScrollArea, Separator } from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/project-build";
import type { Publish } from "~/shared/pubsub";

import { useStyleData } from "./shared/use-style-data";
import { StyleSettings } from "./style-settings";

import { StyleSourcesSection } from "./style-source-section";

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

  if (currentStyle === undefined || selectedInstance === undefined) {
    return null;
  }

  return (
    <>
      <Box
        css={{
          px: theme.spacing[9],
          pb: theme.spacing[9],
          boxShadow: theme.shadows.panelSectionDropShadow,
        }}
      >
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
