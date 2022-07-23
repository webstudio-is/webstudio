import type { Publish } from "@webstudio-is/react-sdk";
import { willRender } from "~/designer/shared/breakpoints";
import { Box, Card, Paragraph } from "~/shared/design-system";
import type { SelectedInstanceData } from "~/shared/canvas-components";
import { useStyleData } from "./lib/use-style-data";
import { StyleSettings } from "./style-settings";
import { Search } from "./search";
import { useState } from "react";
import {
  useCanvasWidth,
  useSelectedBreakpoint,
} from "~/designer/shared/nano-states";
import { ComponentInfo } from "~/designer/shared/inspector";

type StylePanelProps = {
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

export const StylePanel = ({
  selectedInstanceData,
  publish,
}: StylePanelProps) => {
  const { currentStyle, inheritedStyle, setProperty } = useStyleData({
    selectedInstanceData,
    publish,
  });
  const [breakpoint] = useSelectedBreakpoint();
  const [canvasWidth] = useCanvasWidth();
  const [search, setSearch] = useState("");

  if (
    currentStyle === undefined ||
    inheritedStyle === undefined ||
    selectedInstanceData === undefined ||
    breakpoint === undefined
  ) {
    return null;
  }

  if (willRender(breakpoint, canvasWidth) === false) {
    return (
      <Box css={{ p: "$2" }}>
        <Card css={{ p: "$3", mt: "$3" }}>
          <Paragraph css={{ marginBottom: "$2" }}>
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
      {
        <Box css={{ p: "$3 $3 $1 $3" }}>
          <ComponentInfo selectedInstanceData={selectedInstanceData} />
        </Box>
      }
      <Box css={{ overflow: "auto" }}>
        <Box css={{ p: "$3", paddingTop: "$2" }}>
          <Search onSearch={setSearch} />
        </Box>
        <StyleSettings
          search={search}
          selectedInstanceData={selectedInstanceData}
          currentStyle={currentStyle}
          inheritedStyle={inheritedStyle}
          setProperty={setProperty}
        />
      </Box>
    </>
  );
};
