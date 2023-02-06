import type { Publish } from "~/shared/pubsub";
import { willRender } from "~/designer/shared/breakpoints";
import {
  Box,
  Card,
  DeprecatedParagraph,
  SearchField,
} from "@webstudio-is/design-system";
import type { Instance } from "@webstudio-is/project-build";
import { useStyleData } from "./shared/use-style-data";
import { StyleSettings } from "./style-settings";
import { useState } from "react";
import {
  useCanvasWidth,
  useSelectedBreakpoint,
} from "~/designer/shared/nano-states";
import { theme } from "@webstudio-is/design-system";

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

  const [breakpoint] = useSelectedBreakpoint();
  const [canvasWidth] = useCanvasWidth();
  const [search, setSearch] = useState("");

  if (
    currentStyle === undefined ||
    selectedInstance === undefined ||
    breakpoint === undefined
  ) {
    return null;
  }

  if (willRender(breakpoint, canvasWidth) === false) {
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
      <Box css={{ px: theme.spacing[9], py: theme.spacing[3] }}>
        <SearchField
          placeholder="Search"
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          onCancel={() => {
            setSearch("");
          }}
        />
      </Box>

      <Box
        css={{
          overflow: "auto",
        }}
      >
        <StyleSettings
          search={search}
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          createBatchUpdate={createBatchUpdate}
        />
      </Box>
    </>
  );
};
