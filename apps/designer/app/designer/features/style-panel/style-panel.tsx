import type { Publish } from "~/shared/pubsub";
import { willRender } from "~/designer/shared/breakpoints";
import { Box, Card, Paragraph, SearchField } from "@webstudio-is/design-system";
import type { SelectedInstanceData } from "@webstudio-is/project";
import { useStyleData } from "./shared/use-style-data";
import { StyleSettings } from "./style-settings";
import { useState } from "react";
import {
  useCanvasWidth,
  useSelectedBreakpoint,
} from "~/designer/shared/nano-states";

type StylePanelProps = {
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

export const StylePanel = ({
  selectedInstanceData,
  publish,
}: StylePanelProps) => {
  const { currentStyle, setProperty, deleteProperty, createBatchUpdate } =
    useStyleData({
      selectedInstanceData,
      publish,
    });

  const [breakpoint] = useSelectedBreakpoint();
  const [canvasWidth] = useCanvasWidth();
  const [search, setSearch] = useState("");

  if (
    currentStyle === undefined ||
    selectedInstanceData === undefined ||
    breakpoint === undefined
  ) {
    return null;
  }

  if (willRender(breakpoint, canvasWidth) === false) {
    return (
      <Box css={{ p: "$spacing$5" }}>
        <Card css={{ p: "$spacing$9", mt: "$spacing$9" }}>
          <Paragraph css={{ marginBottom: "$spacing$5" }}>
            {`Please increase the canvas width.`}
          </Paragraph>
          <Paragraph>
            {`"${breakpoint.label}" breakpoint minimum width is ${breakpoint.minWidth}px.`}
          </Paragraph>
        </Card>
      </Box>
    );
  }

  return (
    <>
      <Box css={{ px: "$spacing$9", py: "$spacing$3" }}>
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
          selectedInstanceData={selectedInstanceData}
          currentStyle={currentStyle}
          setProperty={setProperty}
          deleteProperty={deleteProperty}
          createBatchUpdate={createBatchUpdate}
        />
      </Box>
    </>
  );
};
