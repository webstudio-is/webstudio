import type { Publish } from "~/designer/iframe";
import { Box } from "~/shared/design-system";
import type { SelectedInstanceData } from "~/shared/component";
import { useStyleData } from "./use-style-data";
import { ComponentInfo } from "./component-info";
import { VisualSettings } from "./settings";

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
      <VisualSettings
        selectedInstanceData={selectedInstanceData}
        currentStyle={currentStyle}
        inheritedStyle={inheritedStyle}
        setProperty={setProperty}
      />
    </>
  );
};
