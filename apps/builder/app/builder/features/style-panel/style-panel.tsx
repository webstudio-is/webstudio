import { useStore } from "@nanostores/react";
import {
  theme,
  Box,
  Card,
  DeprecatedParagraph,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/project-build";
import type { Publish } from "~/shared/pubsub";
import { selectedBreakpointStore } from "~/shared/nano-states";
import { useStyleData } from "./shared/use-style-data";
import { StyleSettings } from "./style-settings";
import { canvasWidthContainer } from "~/builder/shared/nano-states";
import { StyleSourcesSection } from "./style-source-section";
import { matchMedia } from "@webstudio-is/css-engine";
import { useEffect, useState } from "react";

type StylePanelProps = {
  publish: Publish;
  selectedInstance: Instance;
};

const useMatchMedia = () => {
  const [matched, setMatched] = useState(false);

  useEffect(() => {
    return canvasWidthContainer.subscribe((canvasWidth) => {
      const breakpoint = selectedBreakpointStore.get();
      if (breakpoint === undefined) {
        return;
      }

      if (canvasWidth === undefined) {
        return;
      }

      if (matchMedia(breakpoint, canvasWidth) === false) {
        setMatched(true);
        return;
      }

      setMatched(false);
    });
  }, []);

  return matched;
};

export const StylePanel = ({ selectedInstance, publish }: StylePanelProps) => {
  const { currentStyle, setProperty, deleteProperty, createBatchUpdate } =
    useStyleData({
      selectedInstance,
      publish,
    });

  const renderWarning = useMatchMedia();

  const breakpoint = useStore(selectedBreakpointStore);

  if (
    currentStyle === undefined ||
    selectedInstance === undefined ||
    breakpoint === undefined
  ) {
    return null;
  }

  if (renderWarning) {
    return (
      <Box css={{ p: theme.spacing[5] }}>
        <Card css={{ p: theme.spacing[9], mt: theme.spacing[9] }}>
          <DeprecatedParagraph css={{ marginBottom: theme.spacing[5] }}>
            {`Please increase the canvas width.`}
          </DeprecatedParagraph>
          <DeprecatedParagraph>
            {"minWidth" in breakpoint
              ? `"${breakpoint.label}" breakpoint minimum width is ${breakpoint.minWidth}px.`
              : "maxWidth" in breakpoint
              ? `"${breakpoint.label}" breakpoint maximum width is ${breakpoint.maxWidth}px.`
              : ""}
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
          boxShadow: theme.shadows.panelSectionDropShadow,
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
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          createBatchUpdate={createBatchUpdate}
        />
      </Box>
    </>
  );
};
