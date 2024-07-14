import { Flex, Select, theme } from "@webstudio-is/design-system";
import { humanizeString } from "~/shared/string-utils";
import { Separator } from "~/builder/shared/assets";
import { useState } from "react";
import { TranslatePanelContent } from "./translate";
import { ScalePanelContent } from "./scale";
import { RotatePanelContent } from "./rotate";
import { SkewFloatingPanelContent } from "./skew";
import type { SetProperty } from "../../shared/use-style-data";
import type { StyleInfo } from "../../shared/style-info";
import { transformPanels, type TransformPanel } from "./transforms";

type TransformPanelContentProps = {
  currentStyle: StyleInfo;
  panel: TransformPanel;
  setProperty: SetProperty;
};

export const TransformPanelContent = (props: TransformPanelContentProps) => {
  const { panel, setProperty, currentStyle } = props;
  const [selectedPanel, setSelectedPanel] = useState<TransformPanel>(panel);

  return (
    <Flex direction="column">
      <Flex css={{ p: theme.spacing[9] }}>
        <Select
          fullWidth
          value={selectedPanel}
          options={Array.from(transformPanels)}
          getLabel={humanizeString}
          onChange={setSelectedPanel}
        />
      </Flex>
      <Separator />
      <Flex css={{ px: theme.spacing[9], paddingBottom: theme.spacing[9] }}>
        {selectedPanel === "translate" ? (
          <TranslatePanelContent
            currentStyle={currentStyle}
            setProperty={setProperty}
          />
        ) : undefined}
        {selectedPanel === "scale" ? (
          <ScalePanelContent
            currentStyle={currentStyle}
            setProperty={setProperty}
          />
        ) : undefined}
        {selectedPanel === "rotate" ? (
          <RotatePanelContent
            currentStyle={currentStyle}
            setProperty={setProperty}
          />
        ) : undefined}
        {selectedPanel === "skew" ? (
          <SkewFloatingPanelContent
            currentStyle={currentStyle}
            setProperty={setProperty}
          />
        ) : undefined}
      </Flex>
    </Flex>
  );
};
