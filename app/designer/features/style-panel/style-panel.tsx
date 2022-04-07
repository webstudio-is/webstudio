import type { Publish } from "~/designer/features/canvas-iframe";
import { Box } from "~/shared/design-system";
import type { SelectedInstanceData } from "~/shared/component";
import { useStyleData } from "./use-style-data";
import { ComponentInfo } from "../../shared/inspector";
import { VisualSettings } from "./settings";
import { Search } from "./search";
import { useState } from "react";

type StylePanelProps = {
  publish: Publish;
  selectedInstanceData?: SelectedInstanceData;
};

export const StylePanel = ({
  selectedInstanceData,
  publish,
}: StylePanelProps) => {
  const [currentStyle, inheritedStyle, setProperty] = useStyleData({
    selectedInstanceData,
    publish,
  });
  const [search, setSearch] = useState("");

  if (
    currentStyle === undefined ||
    inheritedStyle === undefined ||
    selectedInstanceData === undefined
  ) {
    return null;
  }

  return (
    <>
      <Box css={{ p: "$2" }}>
        <ComponentInfo selectedInstanceData={selectedInstanceData} />
      </Box>
      <Box css={{ p: "$2" }}>
        <Search onSearch={setSearch} />
      </Box>
      <VisualSettings
        search={search}
        selectedInstanceData={selectedInstanceData}
        currentStyle={currentStyle}
        inheritedStyle={inheritedStyle}
        setProperty={setProperty}
      />
    </>
  );
};
