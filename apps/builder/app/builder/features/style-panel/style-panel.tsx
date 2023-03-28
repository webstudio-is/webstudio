import { useStore } from "@nanostores/react";
import {
  theme,
  Box,
  Card,
  DeprecatedParagraph,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/project-build";
import type { Publish } from "~/shared/pubsub";
import { selectedBreakpointStore } from "~/shared/nano-states/breakpoints";
import { useStyleData } from "./shared/use-style-data";
import { StyleSettings } from "./style-settings";
import { useCanvasWidth } from "~/builder/shared/nano-states";
import { StyleSourcesSection } from "./style-source-section";
import { matchMedia } from "@webstudio-is/css-engine";

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

  const breakpoint = useStore(selectedBreakpointStore);
  const [canvasWidth] = useCanvasWidth();

  if (
    currentStyle === undefined ||
    selectedInstance === undefined ||
    breakpoint === undefined
  ) {
    return null;
  }

  if (matchMedia(breakpoint, canvasWidth) === false) {
    return (
      <Box css={{ p: theme.spacing[5] }}>
        <Card css={{ p: theme.spacing[9], mt: theme.spacing[9] }}>
          <DeprecatedParagraph css={{ marginBottom: theme.spacing[5] }}>
            {`Please increase the canvas width.`}
          </DeprecatedParagraph>
          <DeprecatedParagraph>
            {`"${breakpoint.label}" breakpoint minimum width is ${breakpoint.minWidth}px.`}
          </DeprecatedParagraph>
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
          boxShadow: `0px 1px 0 ${theme.colors.panelOutline}`,
        }}
      >
        <StyleSourcesSection />
      </Box>
      <Box
        css={{
          overflow: "auto",
        }}
      >
        <StyleSettings
          search=""
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          createBatchUpdate={createBatchUpdate}
        />
      </Box>
    </>
  );
};
